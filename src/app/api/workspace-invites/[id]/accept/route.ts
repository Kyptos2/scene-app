import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { ROLE_DEPARTMENT, DEFAULT_CHANNELS } from "@/lib/workspaces";

// POST /api/workspace-invites/[id]/accept — creates the WorkspaceMember,
// derives its department from the invited role via the same ROLE_DEPARTMENT
// map used when a workspace is first spun up, and makes sure that
// department's channel exists rather than leaving the member with nowhere
// to post.
export async function POST(_request: Request, ctx: RouteContext<"/api/workspace-invites/[id]/accept">) {
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

  const department = invite.role ? ROLE_DEPARTMENT[invite.role] : null;

  await prisma.$transaction(async (tx) => {
    await tx.workspaceInvite.update({
      where: { id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
    await tx.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      create: { workspaceId: invite.workspaceId, userId, department },
      update: { department },
    });
    if (department) {
      const existing = await tx.channel.findFirst({
        where: { workspaceId: invite.workspaceId, name: department },
        select: { id: true },
      });
      if (!existing) {
        await tx.channel.create({ data: { workspaceId: invite.workspaceId, name: department } });
      }
    }
    // Belt-and-suspenders: a workspace created before DEFAULT_CHANNELS
    // existed, or one seeded oddly, still gets #general so a brand-new
    // member always has somewhere to land.
    const hasGeneral = await tx.channel.findFirst({
      where: { workspaceId: invite.workspaceId, name: DEFAULT_CHANNELS[0] },
      select: { id: true },
    });
    if (!hasGeneral) {
      await tx.channel.create({ data: { workspaceId: invite.workspaceId, name: DEFAULT_CHANNELS[0] } });
    }
  });

  return NextResponse.json({ ok: true, workspaceId: invite.workspaceId });
}
