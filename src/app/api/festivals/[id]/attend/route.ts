import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { requireGoldTier } from "@/lib/subscription";
import { Prisma } from "@/generated/prisma/client";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/festivals/[id]/attend">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const gate = await requireGoldTier(userId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id: festivalId } = await ctx.params;
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });
  if (!festival) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const attendee = await prisma.festivalAttendee.create({
      data: { festivalId, userId },
    });
    return NextResponse.json(attendee, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, alreadyAttending: true });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/festivals/[id]/attend">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: festivalId } = await ctx.params;
  await prisma.festivalAttendee.deleteMany({ where: { festivalId, userId } });
  return NextResponse.json({ ok: true });
}
