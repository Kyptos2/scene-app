import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// Backs the "Open Workspace" primary action on Home — the one-tap entry
// point needs to know, without the caller picking a project first, which
// workspace(s) the viewer actually belongs to.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        include: {
          project: { select: { title: true, posterUrl: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    projectTitle: m.workspace.project?.title ?? null,
    posterUrl: m.workspace.project?.posterUrl ?? null,
    memberCount: m.workspace._count.members,
  }));

  return NextResponse.json({ results });
}
