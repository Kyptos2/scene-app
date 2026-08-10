import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

const createSchema = z.object({
  festivalId: z.string().min(1),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/festival-films">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can submit it to a festival." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const festival = await prisma.festival.findUnique({ where: { id: parsed.data.festivalId } });
  if (!festival) {
    return NextResponse.json({ error: "Festival not found." }, { status: 404 });
  }

  try {
    const festivalFilm = await prisma.festivalFilm.create({
      data: { projectId, festivalId: parsed.data.festivalId },
      include: { festival: true },
    });
    return NextResponse.json(festivalFilm, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This project is already entered into that festival." },
        { status: 409 }
      );
    }
    throw error;
  }
}
