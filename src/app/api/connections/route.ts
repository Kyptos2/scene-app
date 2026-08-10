import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

const createSchema = z.object({
  targetUserId: z.string().min(1),
  note: z.string().max(500).nullable().optional(),
  festivalId: z.string().nullable().optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const personSelect = {
    id: true,
    name: true,
    username: true,
    avatarUrl: true,
    tagline: true,
    primaryRoles: true,
    availabilityStatus: true,
    experienceLevel: true,
  } as const;

  const connections = await prisma.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    include: {
      requester: { select: personSelect },
      receiver: { select: personSelect },
      festival: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = connections.map((c) => ({
    id: c.id,
    otherUser: c.requesterId === userId ? c.receiver : c.requester,
    note: c.note,
    festival: c.festival,
    createdAt: c.createdAt,
  }));

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { targetUserId, note, festivalId } = parsed.data;

  if (targetUserId === userId) {
    return NextResponse.json({ error: "You can't connect with yourself." }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userId, receiverId: targetUserId },
        { requesterId: targetUserId, receiverId: userId },
      ],
    },
  });

  const connection = existing
    ? await prisma.connection.update({
        where: { id: existing.id },
        data: { status: "ACCEPTED", note: note ?? existing.note, festivalId: festivalId ?? existing.festivalId },
      })
    : await prisma.connection.create({
        data: {
          requesterId: userId,
          receiverId: targetUserId,
          status: "ACCEPTED",
          note: note ?? null,
          festivalId: festivalId ?? null,
        },
      });

  if (!existing) {
    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    void sendPushToUser(targetUserId, {
      title: "New connection",
      body: `${requester?.name ?? "Someone"} connected with you.`,
      data: { type: "connection_made", connectionId: connection.id },
    });
  }

  return NextResponse.json(connection, { status: existing ? 200 : 201 });
}
