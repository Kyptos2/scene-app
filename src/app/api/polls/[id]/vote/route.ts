import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const voteSchema = z.object({ optionId: z.string().min(1) });

export async function POST(request: Request, ctx: RouteContext<"/api/polls/[id]/vote">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: pollId } = await ctx.params;
  const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: true } });
  if (!poll) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (poll.closesAt < new Date()) {
    return NextResponse.json({ error: "This poll has closed." }, { status: 400 });
  }

  const parsed = voteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!poll.options.some((o) => o.id === parsed.data.optionId)) {
    return NextResponse.json({ error: "Not a valid option for this poll." }, { status: 400 });
  }

  // One vote per poll per user — re-voting changes the pick rather than
  // stacking a second row, so upsert on the (pollId, userId) unique key.
  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId } },
    create: { pollId, userId, optionId: parsed.data.optionId },
    update: { optionId: parsed.data.optionId },
  });

  const options = await prisma.pollOption.findMany({
    where: { pollId },
    orderBy: { order: "asc" },
    include: { _count: { select: { votes: true } } },
  });

  return NextResponse.json({
    options: options.map((o) => ({ id: o.id, label: o.label, votes: o._count.votes })),
    totalVotes: options.reduce((sum, o) => sum + o._count.votes, 0),
    viewerVoteId: parsed.data.optionId,
  });
}
