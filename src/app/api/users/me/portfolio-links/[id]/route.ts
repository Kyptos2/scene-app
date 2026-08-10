import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/users/me/portfolio-links/[id]">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const link = await prisma.portfolioLink.findUnique({ where: { id } });
  if (!link || link.userId !== userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.portfolioLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
