import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// GET /api/users/me/workspace-invites — pending invites addressed to the
// caller, surfaced on the Connections tab alongside message requests since
// both are inbound network asks waiting on a response.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const invites = await prisma.workspaceInvite.findMany({
    where: { inviteeId: userId, status: "PENDING" },
    include: {
      inviter: { select: { id: true, name: true, username: true, avatarUrl: true } },
      workspace: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ results: invites });
}
