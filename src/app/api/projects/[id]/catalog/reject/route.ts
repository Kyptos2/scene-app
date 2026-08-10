import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

const rejectSchema = z.object({ note: z.string().trim().max(500).nullable().optional() });

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/catalog/reject">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isModerator: true } });
  if (!me?.isModerator) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id: projectId } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.catalogStatus !== "PENDING") {
    return NextResponse.json({ error: "This film isn't awaiting review." }, { status: 400 });
  }

  const parsed = rejectSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      catalogStatus: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: userId,
      rejectionNote: parsed.data.note ?? null,
    },
  });

  void sendPushToUser(project.ownerId, {
    title: "Film not approved",
    body: parsed.data.note
      ? `"${project.title}" wasn't approved: ${parsed.data.note}`
      : `"${project.title}" wasn't approved for the catalog.`,
    data: { type: "catalog_rejected", projectId },
  });

  return NextResponse.json(updated);
}
