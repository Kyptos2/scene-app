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
  connectionStatus: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const currentUser = await getCurrentUser();
  const origin = getRequestOrigin(url, currentUser);
  const { lat, lng } = origin ?? { lat: null, lng: null };
  const viewerId = currentUser?.id ?? null;
  const blockedUserIds = await getBlockedUserIds(viewerId);

  const cleanQuery = q.startsWith("@") ? q.slice(1) : q;
  const matchingRoles = Object.entries(ROLE_LABELS)
    .filter(([, label]) => label.toLowerCase().includes(cleanQuery.toLowerCase()))
    .map(([key]) => key);

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      u.id, u.name, u.username, u.tagline, u."avatarUrl", u."availabilityStatus",
      u."primaryRoles"::text[] AS "roles",
      EXISTS(SELECT 1 FROM "Credit" c WHERE c."userId" = u.id AND c."isVerified" = true) AS verified,
      CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
        THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography) / 1000
        ELSE NULL
      END AS "distanceKm",
      (
        SELECT conn.status::text FROM "Connection" conn
        WHERE ${viewerId}::text IS NOT NULL AND (
          (conn."requesterId" = ${viewerId}::text AND conn."receiverId" = u.id)
          OR (conn."requesterId" = u.id AND conn."receiverId" = ${viewerId}::text)
        )
        LIMIT 1
      ) AS "connectionStatus"
    FROM "User" u
    WHERE
      (${viewerId}::text IS NULL OR u.id != ${viewerId}::text)
      AND (
        u.name ILIKE ${"%" + cleanQuery + "%"}
        OR u.username ILIKE ${cleanQuery + "%"}
        OR u."primaryRoles"::text[] && ${matchingRoles}::text[]
      )
    ORDER BY
      CASE WHEN ${lat}::float8 IS NOT NULL AND u.geog IS NOT NULL
        THEN ST_Distance(u.geog, ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography)
        ELSE NULL
      END ASC NULLS LAST,
      u.name ASC
    LIMIT 20
  `;

  const results = rows.filter((row) => !blockedUserIds.has(row.id)).map((row) => ({
    id: row.id,
    name: row.name,
    handle: row.username,
    tagline: row.tagline ?? (row.roles[0] ? ROLE_LABELS[row.roles[0] as FilmRole] ?? row.roles[0] : "Filmmaker"),
    avatarUrl: row.avatarUrl,
    availabilityStatus: row.availabilityStatus,
    roles: row.roles,
    verified: row.verified,
    distanceKm: row.distanceKm,
    connectionStatus: row.connectionStatus === "ACCEPTED" ? "connected" : row.connectionStatus === "PENDING" ? "pending" : "none",
  }));

  return NextResponse.json({ results });
}
