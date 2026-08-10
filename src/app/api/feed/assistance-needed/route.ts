import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRequestOrigin, getRadiusKm } from "@/lib/geo";
import { FilmRole } from "@/generated/prisma/enums";

type Row = {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  projectPosterUrl: string | null;
  postedById: string;
  roleNeeded: string;
  compensationType: string;
  city: string | null;
  state: string | null;
  startDate: Date | null;
  endDate: Date | null;
  distanceKm: number | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();
  const origin = getRequestOrigin(url, currentUser);
  const radiusKm = getRadiusKm(url);

  const roleParam = url.searchParams.get("role");
  const role =
    roleParam && (Object.values(FilmRole) as string[]).includes(roleParam)
      ? (roleParam as FilmRole)
      : null;

  const { lat, lng } = origin ?? { lat: null, lng: null };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      pr.id,
      pr.title,
      pr."projectId",
      pj.title AS "projectTitle",
      pj."posterUrl" AS "projectPosterUrl",
      pr."postedById",
      pr."roleNeeded"::text AS "roleNeeded",
      pr."compensationType"::text AS "compensationType",
      pr.city,
      pr.state,
      pr."startDate",
      pr."endDate",
      CASE WHEN ${lat}::float8 IS NOT NULL AND pr.geog IS NOT NULL
        THEN ST_Distance(pr.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
        ELSE NULL
      END AS "distanceKm"
    FROM "ProductionRequest" pr
    JOIN "Project" pj ON pj.id = pr."projectId"
    WHERE pr."isFilled" = false
      AND (${role}::text IS NULL OR pr."roleNeeded"::text = ${role})
      AND (
        ${lat}::float8 IS NULL OR pr.geog IS NULL
        OR ST_DWithin(pr.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography, ${radiusKm * 1000})
      )
    ORDER BY
      CASE WHEN ${lat}::float8 IS NOT NULL AND pr.geog IS NOT NULL
        THEN ST_Distance(pr.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography)
        ELSE NULL
      END ASC NULLS LAST,
      pr."createdAt" DESC
    LIMIT 50
  `;

  return NextResponse.json({ role, radiusKm: origin ? radiusKm : null, results: rows });
}
