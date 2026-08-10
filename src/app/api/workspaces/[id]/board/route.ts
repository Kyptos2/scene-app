import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

async function assertMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return !!membership;
}

// Lazily creates the board on first visit — same pattern as Workspace
// itself being created on first "Open Workspace" tap, rather than a
// migration backfill or a creation step the user has to remember to do.
async function getOrCreateBoard(workspaceId: string) {
  const existing = await prisma.board.findUnique({
    where: { workspaceId },
    include: { nodes: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) return existing;

  return prisma.board.create({
    data: { workspaceId },
    include: { nodes: true },
  });
}

export async function GET(_request: Request, ctx: RouteContext<"/api/workspaces/[id]/board">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId } = await ctx.params;
  if (!(await assertMember(workspaceId, userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const board = await getOrCreateBoard(workspaceId);
  return NextResponse.json(board);
}

const createNodeSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().min(80).max(2000).optional(),
  height: z.number().min(60).max(2000).optional(),
  color: z.string().max(20).optional(),
  text: z.string().max(4000).optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/workspaces/[id]/board">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId } = await ctx.params;
  if (!(await assertMember(workspaceId, userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = createNodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const board = await getOrCreateBoard(workspaceId);
  const node = await prisma.boardNode.create({
    data: { boardId: board.id, createdById: userId, ...parsed.data },
  });

  return NextResponse.json(node, { status: 201 });
}
