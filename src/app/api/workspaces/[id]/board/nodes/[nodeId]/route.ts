import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

async function assertNodeInWorkspace(workspaceId: string, nodeId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) return "not_authorized" as const;

  const node = await prisma.boardNode.findUnique({ where: { id: nodeId }, include: { board: true } });
  if (!node || node.board.workspaceId !== workspaceId) return "not_found" as const;

  return "ok" as const;
}

const patchSchema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().min(80).max(2000).optional(),
  height: z.number().min(60).max(2000).optional(),
  color: z.string().max(20).optional(),
  text: z.string().max(4000).optional(),
});

// Any workspace member can move/edit/delete any note — same trust model as
// the channel chat (one team, one shared space), not a per-note ownership
// lock that would make a teammate unable to nudge something into place.
export async function PATCH(request: Request, ctx: RouteContext<"/api/workspaces/[id]/board/nodes/[nodeId]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId, nodeId } = await ctx.params;
  const check = await assertNodeInWorkspace(workspaceId, nodeId, userId);
  if (check === "not_found") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (check === "not_authorized") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const node = await prisma.boardNode.update({ where: { id: nodeId }, data: parsed.data });
  return NextResponse.json(node);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/workspaces/[id]/board/nodes/[nodeId]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId, nodeId } = await ctx.params;
  const check = await assertNodeInWorkspace(workspaceId, nodeId, userId);
  if (check === "not_found") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (check === "not_authorized") return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  await prisma.boardNode.delete({ where: { id: nodeId } });
  return NextResponse.json({ ok: true });
}
