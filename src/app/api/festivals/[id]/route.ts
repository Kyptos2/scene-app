import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, ctx: RouteContext<"/api/festivals/[id]">) {
  const { id } = await ctx.params;

  const festival = await prisma.festival.findUnique({
    where: { id },
    include: {
      featuredFilms: { include: { project: { select: { id: true, title: true } } } },
      attendees: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!festival) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(festival);
}
