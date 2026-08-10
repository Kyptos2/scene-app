import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { DEFAULT_CHANNELS, ROLE_DEPARTMENT } from "@/lib/workspaces";

// POST /api/projects/[id]/workspace — the project owner spins up the group
// workspace. Members are whoever currently holds a verified Credit on the
// project (plus the owner); department channels are derived from those
// members' roles, so a 2-person short doesn't get 5 empty channels.
export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/workspace">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { credits: { where: { isVerified: true } }, workspaces: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Only the project owner can create a workspace." }, { status: 403 });
  }
  if (project.workspaces.length > 0) {
    return NextResponse.json({ id: project.workspaces[0].id }, { status: 200 });
  }

  const memberIds = new Set([project.ownerId, ...project.credits.map((c) => c.userId)]);
  const departments = new Set(
    project.credits.map((c) => ROLE_DEPARTMENT[c.role]).filter((d): d is string => d !== null),
  );

  const workspace = await prisma.workspace.create({
    data: {
      projectId,
      name: project.title,
      members: { create: [...memberIds].map((id) => ({ userId: id })) },
      channels: { create: [...DEFAULT_CHANNELS, ...departments].map((name) => ({ name })) },
    },
  });

  return NextResponse.json({ id: workspace.id }, { status: 201 });
}
