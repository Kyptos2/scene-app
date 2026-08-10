import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { FilmRole } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

const createSchema = z.object({
  role: z.enum(FilmRole),
  userEmail: z.string().email().optional(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/credits">
) {
  const requesterId = await getSessionUserId();
  if (!requesterId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, userEmail } = parsed.data;
  const isOwner = requesterId === project.ownerId;

  let targetUserId = requesterId;
  if (userEmail) {
    const targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!targetUser) {
      return NextResponse.json({ error: "No SCENE user with that email." }, { status: 404 });
    }
    targetUserId = targetUser.id;
    if (targetUserId !== requesterId && !isOwner) {
      return NextResponse.json(
        { error: "Only the project owner can tag other collaborators." },
        { status: 403 }
      );
    }
  }

  const isVerified = isOwner;

  try {
    const credit = await prisma.credit.create({
      data: {
        userId: targetUserId,
        projectId,
        role,
        isVerified,
        verifiedById: isVerified ? requesterId : null,
        verifiedAt: isVerified ? new Date() : null,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(credit, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That credit already exists for this project." },
        { status: 409 }
      );
    }
    throw error;
  }
}
