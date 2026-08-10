import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const submitSchema = z.object({
  links: z
    .array(z.object({ label: z.string().trim().min(1).max(40), url: z.string().trim().url() }))
    .max(5)
    .optional()
    .default([]),
});

// POST /api/projects/[id]/catalog/submit — owner submits an existing project
// to the Indie Catalog for review. Requires a poster already uploaded via
// /poster. Flips catalogStatus to PENDING; a moderator approves/rejects from
// there. Re-submitting a REJECTED project is allowed (clears the note).
export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/catalog/submit">) {
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
    return NextResponse.json({ error: "Only the project owner can submit this film." }, { status: 403 });
  }
  if (project.catalogStatus === "PENDING") {
    return NextResponse.json({ error: "This film is already awaiting review." }, { status: 400 });
  }
  if (project.catalogStatus === "PUBLISHED") {
    return NextResponse.json({ error: "This film is already published." }, { status: 400 });
  }
  if (!project.posterUrl) {
    return NextResponse.json({ error: "Upload a poster before submitting." }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.projectLink.deleteMany({ where: { projectId } }),
    prisma.projectLink.createMany({
      data: parsed.data.links.map((l) => ({ projectId, label: l.label, url: l.url })),
    }),
    prisma.project.update({
      where: { id: projectId },
      data: {
        catalogStatus: "PENDING",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedById: null,
        rejectionNote: null,
      },
    }),
  ]);

  return NextResponse.json({ catalogStatus: "PENDING" });
}
