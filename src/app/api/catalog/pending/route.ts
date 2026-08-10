import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// GET /api/catalog/pending — moderator-only queue of films awaiting review.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isModerator: true } });
  if (!me?.isModerator) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const films = await prisma.project.findMany({
    where: { catalogStatus: "PENDING" },
    include: {
      owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
      links: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  return NextResponse.json({ results: films });
}
