import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const schema = z.object({ status: z.enum(["REVIEWED", "DISMISSED"]) });

export async function POST(request: Request, ctx: RouteContext<"/api/reports/[id]/resolve">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isModerator: true } });
  if (!me?.isModerator) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { status: parsed.data.status, resolvedById: userId, resolvedAt: new Date() },
  });

  return NextResponse.json(updated);
}
