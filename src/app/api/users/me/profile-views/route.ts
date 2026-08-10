import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { getBlockedUserIds } from "@/lib/blocks";

// GET /api/users/me/profile-views — recent distinct viewers of the caller's
// own profile, most recent view first. One row per viewer even if they
// looked multiple times (the write side already dedupes within an hour,
// this collapses any remaining repeats across a longer window).
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [views, blockedUserIds] = await Promise.all([
    prisma.profileView.findMany({
      where: { viewedId: userId },
      include: {
        viewer: {
          select: { id: true, name: true, username: true, avatarUrl: true, tagline: true, primaryRoles: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getBlockedUserIds(userId),
  ]);

  const seen = new Set<string>();
  const results: { viewer: (typeof views)[number]["viewer"]; viewedAt: Date }[] = [];
  for (const view of views) {
    if (seen.has(view.viewerId) || blockedUserIds.has(view.viewerId)) continue;
    seen.add(view.viewerId);
    results.push({ viewer: view.viewer, viewedAt: view.createdAt });
    if (results.length >= 20) break;
  }

  return NextResponse.json({ results });
}
