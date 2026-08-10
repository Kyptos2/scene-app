import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { PROFILE_INCLUDE } from "@/lib/serializers";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/users/[id]">
) {
  const { id } = await ctx.params;
  const viewerId = await getSessionUserId();

  const [user, block, connection, connectionsCount, profileViewsCount] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: PROFILE_INCLUDE }),
    viewerId ? prisma.block.findUnique({ where: { blockerId_blockedId: { blockerId: viewerId, blockedId: id } } }) : null,
    viewerId && viewerId !== id
      ? prisma.connection.findFirst({
          where: {
            OR: [
              { requesterId: viewerId, receiverId: id },
              { requesterId: id, receiverId: viewerId },
            ],
          },
          select: { status: true },
        })
      : null,
    prisma.connection.count({
      where: { status: "ACCEPTED", OR: [{ requesterId: id }, { receiverId: id }] },
    }),
    prisma.profileView.count({ where: { viewedId: id } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (viewerId && viewerId !== id) {
    void recordProfileView(viewerId, id);
  }

  const viewerConnectionStatus =
    viewerId === id
      ? "self"
      : connection?.status === "ACCEPTED"
        ? "connected"
        : connection?.status === "PENDING"
          ? "pending"
          : "none";

  const { passwordHash: _passwordHash, email: _email, ...publicProfile } = user;
  return NextResponse.json({
    ...publicProfile,
    viewerHasBlocked: !!block,
    viewerConnectionStatus,
    connectionsCount,
    profileViewsCount,
  });
}

// Best-effort, deduped to one row per viewer/viewed pair per hour so
// refreshing or re-navigating to the same profile doesn't spam the
// "who viewed you" list with near-duplicate entries.
async function recordProfileView(viewerId: string, viewedId: string): Promise<void> {
  try {
    const recent = await prisma.profileView.findFirst({
      where: { viewerId, viewedId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
      select: { id: true },
    });
    if (recent) return;
    await prisma.profileView.create({ data: { viewerId, viewedId } });
  } catch (err) {
    console.error("Failed to record profile view:", err);
  }
}
