import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRequestOrigin, getRadiusKm } from "@/lib/geo";

type Row = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  postedById: string;
  roleNeeded: string;
  city: string | null;
  state: string | null;
  festivalId: string;
  festivalName: string;
  festivalStartDate: Date;
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
    SELECT DISTINCT ON (pr.id)
      pr.id,
      pr.title,
      pr."projectId",
      pj.title AS "projectTitle",
      pr."postedById",
      pr."roleNeeded"::text AS "roleNeeded",
      pr.city,
      pr.state,
      f.id AS "festivalId",
      f.name AS "festivalName",
      f."startDate" AS "festivalStartDate",
      ST_Distance(pr.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 AS "distanceKm"
    FROM "ProductionRequest" pr
    JOIN "Project" pj ON pj.id = pr."projectId"
    JOIN "FestivalFilm" ff ON ff."projectId" = pj.id
    JOIN "Festival" f ON f.id = ff."festivalId"
    WHERE f."startDate" >= now()
      AND pr."isFilled" = false
      AND pr.geog IS NOT NULL
      AND ST_DWithin(pr.geog, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusKm * 1000})
    ORDER BY pr.id, f."startDate" ASC
  `;

  rows.sort((a, b) => a.distanceKm - b.distanceKm);

  return NextResponse.json({ radiusKm, results: rows.slice(0, 50) });
}
