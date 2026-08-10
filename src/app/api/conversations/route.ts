import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { canonicalPair, CONVERSATION_PARTICIPANT_SELECT } from "@/lib/messaging";

// GET /api/conversations — the accepted-conversation inbox (not the sandbox).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: { select: CONVERSATION_PARTICIPANT_SELECT },
      userB: { select: CONVERSATION_PARTICIPANT_SELECT },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const results = conversations.map((c) => {
    const last = c.messages[0];
    return {
      id: c.id,
      otherUser: c.userAId === userId ? c.userB : c.userA,
      lastMessage: last
        ? { kind: last.kind, body: last.body, senderId: last.senderId, createdAt: last.createdAt, deletedAt: last.deletedAt }
        : null,
      unread: !!last && last.senderId !== userId && last.readAt === null,
      updatedAt: c.updatedAt,
    };
  });

  return NextResponse.json({ results });
}

const startSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

// POST /api/conversations — send the first message to a user (creating the
// conversation), or a follow-up message to an already-ACCEPTED conversation.
// Whether it lands as an instant DM or a Message Request depends on whether
// an ACCEPTED Connection already exists between the two users.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { recipientId, body } = parsed.data;

  if (recipientId === userId) {
    return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userId, blockedId: recipientId },
        { blockerId: recipientId, blockedId: userId },
      ],
    },
  });
  if (blocked) {
    return NextResponse.json({ error: "You can't message this user." }, { status: 403 });
  }

  const [userAId, userBId] = canonicalPair(userId, recipientId);
  const existing = await prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });

  if (existing) {
    if (existing.status === "DECLINED" || existing.status === "BLOCKED") {
      return NextResponse.json({ error: "You can't message this user." }, { status: 403 });
    }
    if (existing.status === "PENDING_REQUEST") {
      return existing.initiatorId === userId
        ? NextResponse.json({ error: "Your message request is still pending." }, { status: 403 })
        : NextResponse.json({ error: "Accept or deny their request before replying." }, { status: 403 });
    }
    const [conversation, message] = await prisma.$transaction([
      prisma.conversation.update({ where: { id: existing.id }, data: { updatedAt: new Date() } }),
      prisma.message.create({ data: { conversationId: existing.id, senderId: userId, body } }),
    ]);
    return NextResponse.json({ conversation, message }, { status: 201 });
  }

  const mutualConnection = await prisma.connection.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, receiverId: recipientId },
        { requesterId: recipientId, receiverId: userId },
      ],
    },
  });
  const status = mutualConnection ? "ACCEPTED" : "PENDING_REQUEST";

  const conversation = await prisma.conversation.create({
    data: {
      userAId,
      userBId,
      status,
      initiatorId: userId,
      requestNote: status === "PENDING_REQUEST" ? body.slice(0, 280) : null,
      messages: { create: { senderId: userId, body } },
    },
    include: { messages: true },
  });

  return NextResponse.json({ conversation, status }, { status: 201 });
}
