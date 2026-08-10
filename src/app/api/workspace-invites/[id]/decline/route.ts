import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function POST(_request: Request, ctx: RouteContext<"/api/workspace-invites/[id]/decline">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const invite = await prisma.workspaceInvite.findUnique({ where: { id } });
  if (!invite) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (invite.inviteeId !== userId) {
    return NextResponse.json({ error: "This invite isn't yours." }, { status: 403 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "This invite has already been responded to." }, { status: 400 });
  }

  await prisma.workspaceInvite.update({
    where: { id },
    data: { status: "DECLINED", respondedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
