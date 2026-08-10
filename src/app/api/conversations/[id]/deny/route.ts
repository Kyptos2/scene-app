import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function POST(_request: Request, ctx: RouteContext<"/api/conversations/[id]/deny">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (conversation.userAId !== userId && conversation.userBId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  if (conversation.status !== "PENDING_REQUEST" || conversation.initiatorId === userId) {
    return NextResponse.json({ error: "There's nothing to deny here." }, { status: 400 });
  }

  const updated = await prisma.conversation.update({ where: { id }, data: { status: "DECLINED" } });
  return NextResponse.json(updated);
}
