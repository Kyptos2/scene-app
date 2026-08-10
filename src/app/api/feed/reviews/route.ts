import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRequestOrigin, getRadiusKm } from "@/lib/geo";

type Row = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: Date;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl: string | null;
  projectId: string;
  projectTitle: string;
  projectGenre: string | null;
  projectReleaseYear: number | null;
  distanceKm: number | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();
  const origin = getRequestOrigin(url, currentUser);
  const radiusKm = getRadiusKm(url);
  const { lat, lng } = origin ?? { lat: null, lng: null };

  // Local Feed logic: when we know where the viewer is, put nearby films'
  // reviews first (still showing everything else after), rather than
  // hard-filtering the feed down to just local results.
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      r.id,
      r.rating,
      r.body,
      r."createdAt",
      u.id AS "reviewerId",
      u.name AS "reviewerName",
      u."avatarUrl" AS "reviewerAvatarUrl",
      p.id AS "projectId",
      p.title AS "projectTitle",
      p.genre AS "projectGenre",
      p."releaseYear" AS "projectReleaseYear",
      CASE WHEN ${lat}::float8 IS NOT NULL AND p.geog IS NOT NULL
        THEN ST_Distance(p.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
        ELSE NULL
      END AS "distanceKm"
    FROM "Review" r
    JOIN "User" u ON u.id = r."userId"
    JOIN "Project" p ON p.id = r."projectId"
    ORDER BY
      CASE WHEN ${lat}::float8 IS NOT NULL AND p.geog IS NOT NULL
        AND ST_DWithin(p.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography, ${radiusKm * 1000})
        THEN 0 ELSE 1
      END ASC,
      r."createdAt" DESC
    LIMIT 50
  `;

  return NextResponse.json({ radiusKm: origin ? radiusKm : null, results: rows });
}
