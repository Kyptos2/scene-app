import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRequestOrigin, getRadiusKm } from "@/lib/geo";

type Row = {
  id: string;
  title: string;
  genre: string | null;
  status: string;
  releaseYear: number | null;
  logline: string | null;
  city: string | null;
  state: string | null;
  ownerId: string;
  ownerName: string;
  distanceKm: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();
  const origin = getRequestOrigin(url, currentUser);

  if (!origin) {
    return NextResponse.json(
      { error: "Location required. Pass ?lat=&lng= or set your profile location." },
      { status: 400 }
    );
  }

  const radiusKm = getRadiusKm(url);
  const { lat, lng } = origin;

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      p.id,
      p.title,
      p.genre,
      p.status::text AS status,
      p."releaseYear",
      p.logline,
      p.city,
      p.state,
      p."ownerId",
      u.name AS "ownerName",
      ST_Distance(p.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 AS "distanceKm"
    FROM "Project" p
    JOIN "User" u ON u.id = p."ownerId"
    WHERE p.status != 'COMPLETED'
      AND p.geog IS NOT NULL
      AND ST_DWithin(p.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
    ORDER BY "distanceKm" ASC
    LIMIT 50
  `;

  return NextResponse.json({ radiusKm, results: rows });
}
