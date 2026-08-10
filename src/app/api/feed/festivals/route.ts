import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRequestOrigin, getRadiusKm } from "@/lib/geo";
import { computeSubmissionStatus } from "@/lib/festivalSubmission";
import { requireGoldTier } from "@/lib/subscription";

type Row = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  startDate: Date;
  endDate: Date;
  description: string | null;
  distanceKm: number | null;
  isAttending: boolean;
  submissionUrl: string | null;
  submissionDeadline: Date | null;
  urlLastCheckedAt: Date | null;
  urlReachable: boolean | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();
  if (currentUser) {
    const gate = await requireGoldTier(currentUser.id);
    if (!gate.ok) {
      return NextResponse.json(gate.body, { status: gate.status });
    }
  }
  const origin = getRequestOrigin(url, currentUser);
  const radiusKm = getRadiusKm(url);
  const viewerId = currentUser?.id ?? null;

  const withinDaysParam = url.searchParams.get("within_days");
  const withinDays = withinDaysParam ? Number(withinDaysParam) : 7;
  const days = Number.isFinite(withinDays) && withinDays > 0 ? Math.min(withinDays, 365) : 7;

  const { lat, lng } = origin ?? { lat: null, lng: null };

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      f.id,
      f.name,
      f.city,
      f.state,
      f."startDate",
      f."endDate",
      f.description,
      CASE WHEN ${lat}::float8 IS NOT NULL AND f.geog IS NOT NULL
        THEN ST_Distance(f.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
        ELSE NULL
      END AS "distanceKm",
      EXISTS(
        SELECT 1 FROM "FestivalAttendee" fa
        WHERE fa."festivalId" = f.id AND ${viewerId}::text IS NOT NULL AND fa."userId" = ${viewerId}::text
      ) AS "isAttending",
      f."submissionUrl", f."submissionDeadline", f."urlLastCheckedAt", f."urlReachable"
    FROM "Festival" f
    WHERE f."startDate" >= now()
      AND f."startDate" <= now() + (${days} * interval '1 day')
      AND (
        ${lat}::float8 IS NULL OR f.geog IS NULL
        OR ST_DWithin(f.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography, ${radiusKm * 1000})
      )
    ORDER BY f."startDate" ASC
    LIMIT 50
  `;

  const results = rows.map((row) => ({
    ...row,
    submissionStatus: computeSubmissionStatus(row.submissionDeadline),
  }));

  return NextResponse.json({ withinDays: days, radiusKm: origin ? radiusKm : null, results });
}
