import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { requireGoldTier } from "@/lib/subscription";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  description: z.string().max(1000).nullable().optional(),
  submissionUrl: z.string().url().max(500).nullable().optional(),
  submissionDeadline: z.string().datetime().nullable().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  const festivals = await prisma.festival.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { startDate: "asc" },
    take: 20,
  });

  return NextResponse.json(festivals);
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const gate = await requireGoldTier(userId);
  if (!gate.ok) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, submissionDeadline, ...rest } = parsed.data;

  if (new Date(endDate) < new Date(startDate)) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  const festival = await prisma.festival.create({
    data: {
      ...rest,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null,
    },
  });

  return NextResponse.json(festival, { status: 201 });
}
