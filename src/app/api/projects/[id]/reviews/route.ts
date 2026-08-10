import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// rating is in half-star units: 1 = 0.5★ ... 10 = 5.0★ (Letterboxd convention)
const reviewSchema = z.object({
  rating: z.number().int().min(1).max(10),
  body: z.string().max(2000).nullable().optional(),
});

export async function GET(_request: Request, ctx: RouteContext<"/api/projects/[id]/reviews">) {
  const { id: projectId } = await ctx.params;

  const reviews = await prisma.review.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/reviews">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.catalogStatus !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Reviews unlock once this film is published to the catalog." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const review = await prisma.review.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, ...parsed.data },
    update: { rating: parsed.data.rating, body: parsed.data.body ?? null },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(review, { status: 201 });
}

// DELETE /api/projects/[id]/reviews — removes the caller's own review for
// this film. Reviews are keyed by (userId, projectId), so there's no
// separate review id to target.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/projects/[id]/reviews">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  await prisma.review.deleteMany({ where: { userId, projectId } });
  return NextResponse.json({ ok: true });
}
