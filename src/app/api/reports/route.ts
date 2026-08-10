import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { ReportTargetType } from "@/generated/prisma/enums";

const createSchema = z.object({
  targetType: z.enum(ReportTargetType),
  targetId: z.string().min(1),
  reason: z.string().trim().min(1).max(100),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: { reporterId: userId, ...parsed.data },
  });

  return NextResponse.json(report, { status: 201 });
}

// GET /api/reports — moderator-only queue. ?status=PENDING|REVIEWED|DISMISSED
// filters; defaults to PENDING.
export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isModerator: true } });
  if (!me?.isModerator) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status = statusParam === "REVIEWED" || statusParam === "DISMISSED" ? statusParam : "PENDING";

  const reports = await prisma.report.findMany({
    where: { status },
    include: {
      reporter: { select: { id: true, name: true, username: true, avatarUrl: true } },
      resolvedBy: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ results: reports });
}
