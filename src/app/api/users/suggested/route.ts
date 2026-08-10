import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBlockedUserIds } from "@/lib/blocks";
import { getRequestOrigin } from "@/lib/geo";
import { ROLE_LABELS } from "@/lib/roles";
import type { FilmRole } from "@/generated/prisma/enums";

type Row = {
  id: string;
  name: string;
  username: string;
  tagline: string | null;
  avatarUrl: string | null;
  availabilityStatus: string | null;
  roles: string[];
  verified: boolean;
  distanceKm: number | null;
};

// The cold-start problem: a brand-new user has an empty search box and no
// network, so nothing pulls them toward their first few connections. This
// surfaces nearby (or, lacking location, newest) filmmakers they aren't
// already connected to or pending with.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const viewerId = currentUser.id;
  const origin = getRequestOrigin(url, currentUser);
  const { lat, lng } = origin ?? { lat: null, lng: null };
  const blockedUserIds = await getBlockedUserIds(viewerId);

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      u.id, u.name, u.username, u.tagline, u."avatarUrl", u."availabilityStatus",
      u."primaryRoles"::text[] AS "roles",
      EXISTS(SELECT 1 FROM "Credit" c WHERE c."userId" = u.id AND c."isVerified" = true) AS verified,
      CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
        THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
        ELSE NULL
      END AS "distanceKm"
    FROM "User" u
    WHERE
      u.id != ${viewerId}
      AND NOT EXISTS (
        SELECT 1 FROM "Connection" conn
        WHERE (conn."requesterId" = ${viewerId} AND conn."receiverId" = u.id)
           OR (conn."requesterId" = u.id AND conn."receiverId" = ${viewerId})
      )
    ORDER BY
      CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
        THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography)
        ELSE NULL
      END ASC NULLS LAST,
      u."createdAt" DESC
    LIMIT 10
  `;

  const results = rows
    .filter((row) => !blockedUserIds.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      handle: row.username,
      tagline: row.tagline ?? (row.roles[0] ? ROLE_LABELS[row.roles[0] as FilmRole] ?? row.roles[0] : "Filmmaker"),
      avatarUrl: row.avatarUrl,
      availabilityStatus: row.availabilityStatus,
      roles: row.roles,
      verified: row.verified,
      distanceKm: row.distanceKm,
      connectionStatus: "none" as const,
    }));

  return NextResponse.json({ results });
}
