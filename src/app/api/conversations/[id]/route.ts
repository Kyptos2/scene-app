import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { CONVERSATION_PARTICIPANT_SELECT } from "@/lib/messaging";

export async function GET(_request: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      userA: { select: CONVERSATION_PARTICIPANT_SELECT },
      userB: { select: CONVERSATION_PARTICIPANT_SELECT },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });

  const otherUser = conversation.userAId === userId ? conversation.userB : conversation.userA;

  return NextResponse.json({
    id: conversation.id,
    status: conversation.status,
    initiatorId: conversation.initiatorId,
    otherUser,
    messages: conversation.messages,
  });
}
