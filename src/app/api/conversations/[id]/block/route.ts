import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function POST(_request: Request, ctx: RouteContext<"/api/conversations/[id]/block">) {
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

  const otherUserId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;

  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: otherUserId } },
      create: { blockerId: userId, blockedId: otherUserId },
      update: {},
    }),
    prisma.conversation.update({ where: { id }, data: { status: "BLOCKED" } }),
  ]);

  return NextResponse.json({ ok: true });
}
