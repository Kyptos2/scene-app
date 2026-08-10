import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const createSchema = z.object({
  question: z.string().trim().min(1).max(280),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(6),
  durationHours: z.number().int().min(1).max(24 * 14).default(24 * 3),
});

// GET /api/polls — recent community polls (open or recently closed), with
// the caller's own vote state so the client can render results vs. ballot.
export async function GET() {
  const userId = await getSessionUserId();

  const polls = await prisma.poll.findMany({
    where: { closesAt: { gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) } },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      options: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
      votes: userId ? { where: { userId }, select: { optionId: true } } : false,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const results = polls.map((poll) => ({
    id: poll.id,
    question: poll.question,
    closesAt: poll.closesAt,
    createdAt: poll.createdAt,
    author: poll.author,
    options: poll.options.map((o) => ({ id: o.id, label: o.label, votes: o._count.votes })),
    totalVotes: poll.options.reduce((sum, o) => sum + o._count.votes, 0),
    viewerVoteId: poll.votes?.[0]?.optionId ?? null,
  }));

  return NextResponse.json({ results });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!checkRateLimit(`poll-create:${userId}`, 5, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { question, options, durationHours } = parsed.data;
  const poll = await prisma.poll.create({
    data: {
      authorId: userId,
      question,
      closesAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
      options: { create: options.map((label, order) => ({ label, order })) },
    },
    include: { options: true },
  });

  return NextResponse.json(poll, { status: 201 });
}
