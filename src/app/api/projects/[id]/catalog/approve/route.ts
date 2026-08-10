import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST(_request: Request, ctx: RouteContext<"/api/projects/[id]/catalog/approve">) {
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

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { catalogStatus: "PUBLISHED", reviewedAt: new Date(), reviewedById: userId, rejectionNote: null },
  });

  void sendPushToUser(project.ownerId, {
    title: "Film approved",
    body: `"${project.title}" is now live in the Indie Catalog.`,
    data: { type: "catalog_approved", projectId },
  });

  return NextResponse.json(updated);
}
