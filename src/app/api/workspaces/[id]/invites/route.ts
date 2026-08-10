import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { FilmRole } from "@/generated/prisma/enums";

const createSchema = z.object({
  inviteeId: z.string().min(1),
  role: z.enum(FilmRole).nullable().optional(),
});

const personSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  tagline: true,
} as const;

async function assertMember(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return !!membership;
}

// GET /api/workspaces/[id]/invites — the invite tracker: every invite this
// workspace has ever sent, newest first, so members can see who's pending,
// who accepted, and who declined.
export async function GET(_request: Request, ctx: RouteContext<"/api/workspaces/[id]/invites">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId } = await ctx.params;
  if (!(await assertMember(workspaceId, userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId },
    include: { invitee: { select: personSelect }, inviter: { select: personSelect } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ results: invites });
}

// POST /api/workspaces/[id]/invites — any current member can invite another
// filmmaker, same trust level as posting in the workspace's own channels.
export async function POST(request: Request, ctx: RouteContext<"/api/workspaces/[id]/invites">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!checkRateLimit(`workspace-invite:${userId}`, 20, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const { id: workspaceId } = await ctx.params;
  if (!(await assertMember(workspaceId, userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { inviteeId, role } = parsed.data;

  if (inviteeId === userId) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  const [invitee, alreadyMember, existingPending] = await Promise.all([
    prisma.user.findUnique({ where: { id: inviteeId }, select: { id: true, name: true } }),
    prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId: inviteeId } } }),
    prisma.workspaceInvite.findFirst({ where: { workspaceId, inviteeId, status: "PENDING" } }),
  ]);
  if (!invitee) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (alreadyMember) {
    return NextResponse.json({ error: `${invitee.name} is already on this team.` }, { status: 400 });
  }
  if (existingPending) {
    return NextResponse.json({ error: `${invitee.name} already has a pending invite.` }, { status: 400 });
  }

  const invite = await prisma.workspaceInvite.create({
    data: { workspaceId, inviterId: userId, inviteeId, role: role ?? null },
    include: { invitee: { select: personSelect }, inviter: { select: personSelect } },
  });

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
  void sendPushToUser(inviteeId, {
    title: "Team invite",
    body: `${invite.inviter.name} invited you to join ${workspace?.name ?? "a workspace"} on SCENE.`,
    data: { type: "workspace_invite", workspaceId, inviteId: invite.id },
  });

  return NextResponse.json(invite, { status: 201 });
}
