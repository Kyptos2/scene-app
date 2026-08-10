import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { autoFlagIfSlur } from "@/lib/moderation";

export async function GET(_request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { id } = await ctx.params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
      credits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              portfolioLinks: { select: { id: true, label: true, url: true }, orderBy: { createdAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      festivalFilms: {
        include: { festival: { select: { id: true, name: true, startDate: true } } },
        orderBy: { createdAt: "desc" },
      },
      productionRequests: {
        include: { _count: { select: { applications: true } } },
        orderBy: { createdAt: "desc" },
      },
      workspaces: { select: { id: true }, take: 1 },
      links: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(project);
}

const patchSchema = z.object({
  productionGuide: z.string().trim().max(8000).nullable(),
});

// Owner-only: publishes/edits the "how we made this" writeup shown on the
// Films tab so other aspiring filmmakers browsing the catalog can learn
// from the approach. Scoped to just this one field rather than a generic
// project-update endpoint, since that's the only thing editable here today.
export async function PATCH(request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Only the project owner can edit this." }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const productionGuide = parsed.data.productionGuide?.length ? parsed.data.productionGuide : null;
  const updated = await prisma.project.update({
    where: { id },
    data: { productionGuide },
    select: { id: true, productionGuide: true },
  });

  if (productionGuide) {
    void autoFlagIfSlur({ text: productionGuide, targetType: "PROJECT", targetId: id });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Only the project owner can delete this." }, { status: 403 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
