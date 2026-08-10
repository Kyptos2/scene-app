import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/credits/[id]/verify">
) {
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

  if (credit.project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can verify credits." },
      { status: 403 }
    );
  }

  const updated = await prisma.credit.update({
    where: { id },
    data: { isVerified: true, verifiedById: userId, verifiedAt: new Date() },
  });

  return NextResponse.json(updated);
}
