import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// Pinning a message surfaces it as a Workspace Alert card on the Home feed
// for every member of the workspace — same trust level as posting in the
// channel itself, so any member can pin/unpin, not just an owner role.
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/workspaces/[id]/channels/[channelId]/messages/[messageId]/pin">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: workspaceId, channelId, messageId } = await ctx.params;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const message = await prisma.channelMessage.findUnique({ where: { id: messageId } });
  if (!message || message.channelId !== channelId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const updated = await prisma.channelMessage.update({
    where: { id: messageId },
    data: { pinned: !message.pinned },
  });

  return NextResponse.json({ pinned: updated.pinned });
}
