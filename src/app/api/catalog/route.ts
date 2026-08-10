import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CREW_SELECT = { id: true, name: true, username: true, avatarUrl: true } as const;

// GET /api/catalog — the public Indie Catalog: published films with poster,
// logline, tagged (verified) crew, and external links.
export async function GET() {
  const films = await prisma.project.findMany({
    where: { catalogStatus: "PUBLISHED" },
    include: {
      owner: { select: CREW_SELECT },
      credits: { where: { isVerified: true }, include: { user: { select: CREW_SELECT } } },
      links: true,
    },
    orderBy: { reviewedAt: "desc" },
  });

  return NextResponse.json({ results: films });
}
