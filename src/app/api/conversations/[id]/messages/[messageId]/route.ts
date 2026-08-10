import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// Soft delete only — clears body/imageUrl so no content leaks in future
// reads, but keeps the row so the thread still shows a "Message deleted"
// placeholder in its original position rather than a confusing gap.
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/conversations/[id]/messages/[messageId]">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: conversationId, messageId } = await ctx.params;
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.conversationId !== conversationId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (message.senderId !== userId) {
    return NextResponse.json({ error: "You can only delete your own messages." }, { status: 403 });
  }
  if (message.deletedAt) {
    return NextResponse.json(message);
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body: "", imageUrl: null, deletedAt: new Date() },
  });

  return NextResponse.json(updated);
}
