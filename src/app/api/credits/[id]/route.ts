import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/credits/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const credit = await prisma.credit.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!credit) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (credit.userId !== userId && credit.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.credit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
