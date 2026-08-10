import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { ROLE_DEPARTMENT } from "@/lib/workspaces";

const MEMBER_SELECT = { id: true, name: true, username: true, avatarUrl: true } as const;

export async function GET(_request: Request, ctx: RouteContext<"/api/workspaces/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, title: true, ownerId: true, credits: { where: { isVerified: true } } } },
      members: { select: { userId: true } },
    },
  });
  if (!workspace || !workspace.project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const memberIds = new Set(workspace.members.map((m) => m.userId));
  if (!memberIds.has(userId)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Lazily sync membership: anyone newly verified since the workspace was
  // created (or the owner) should already be in — no separate invite step.
  const shouldBeMembers = new Set([workspace.project.ownerId, ...workspace.project.credits.map((c) => c.userId)]);
  const missing = [...shouldBeMembers].filter((id) => !memberIds.has(id));
  if (missing.length > 0) {
    await prisma.workspaceMember.createMany({
      data: missing.map((memberId) => ({ workspaceId: workspace.id, userId: memberId })),
      skipDuplicates: true,
    });
  }

  const missingDepartments = [...new Set(
    workspace.project.credits.map((c) => ROLE_DEPARTMENT[c.role]).filter((d): d is string => d !== null),
  )];
  const existingChannels = await prisma.channel.findMany({ where: { workspaceId: workspace.id }, select: { name: true } });
  const existingNames = new Set(existingChannels.map((c) => c.name));
  const newChannels = missingDepartments.filter((d) => !existingNames.has(d));
  if (newChannels.length > 0) {
    await prisma.channel.createMany({ data: newChannels.map((name) => ({ workspaceId: workspace.id, name })) });
  }

  const [channels, members] = await Promise.all([
    prisma.channel.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { id: { in: [...shouldBeMembers] } }, select: MEMBER_SELECT }),
  ]);

  return NextResponse.json({
    id: workspace.id,
    name: workspace.name,
    project: { id: workspace.project.id, title: workspace.project.title },
    channels,
    members,
  });
}
