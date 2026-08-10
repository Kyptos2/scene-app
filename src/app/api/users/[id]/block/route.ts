import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// POST/DELETE /api/users/[id]/block — direct block from a profile, distinct
// from the in-conversation block action. If a conversation between the two
// already exists, it's also marked BLOCKED so messaging stops immediately.
export async function POST(_request: Request, ctx: RouteContext<"/api/users/[id]/block">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: targetId } = await ctx.params;
  if (targetId === userId) {
    return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [userAId, userBId] = userId < targetId ? [userId, targetId] : [targetId, userId];

  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
      create: { blockerId: userId, blockedId: targetId },
      update: {},
    }),
    prisma.conversation.updateMany({
      where: { userAId, userBId },
      data: { status: "BLOCKED" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/users/[id]/block">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: targetId } = await ctx.params;
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetId } });

  return NextResponse.json({ ok: true });
}
