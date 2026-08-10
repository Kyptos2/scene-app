import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// The Nearby/Featured section on Home needs to feel populated the instant
// it loads, not depend on the viewer being within some radius/day-window of
// an event (that's what the location-filtered /api/feed/festivals list is
// for). This always returns the soonest three upcoming festivals globally —
// falling back to the most recent past ones if fewer than three are
// upcoming, so the section is never empty on a quiet dev/demo database.
const FEATURED_COUNT = 3;

export async function GET() {
  const upcoming = await prisma.festival.findMany({
    where: { startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take: FEATURED_COUNT,
    include: { _count: { select: { attendees: true } } },
  });

  let festivals = upcoming;
  if (festivals.length < FEATURED_COUNT) {
    const fillerCount = FEATURED_COUNT - festivals.length;
    const excludeIds = festivals.map((f) => f.id);
    const recent = await prisma.festival.findMany({
      where: { startDate: { lt: new Date() }, id: { notIn: excludeIds } },
      orderBy: { startDate: "desc" },
      take: fillerCount,
      include: { _count: { select: { attendees: true } } },
    });
    festivals = [...festivals, ...recent];
  }

  const results = festivals.map((f) => ({
    id: f.id,
    name: f.name,
    posterUrl: f.posterUrl,
    city: f.city,
    state: f.state,
    startDate: f.startDate,
    endDate: f.endDate,
    attendeeCount: f._count.attendees,
  }));

  return NextResponse.json({ results });
}
