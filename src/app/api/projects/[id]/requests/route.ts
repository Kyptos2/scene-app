import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { autoFlagIfSlur } from "@/lib/moderation";
import { FilmRole, CompensationType } from "@/generated/prisma/enums";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  roleNeeded: z.enum(FilmRole),
  description: z.string().max(1000).nullable().optional(),
  compensationType: z.enum(CompensationType).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/requests">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!checkRateLimit(`crew-call-create:${userId}`, 10, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const { id: projectId } = await ctx.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (project.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the project owner can post a crew request." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { startDate, endDate, ...rest } = parsed.data;

  const productionRequest = await prisma.productionRequest.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      projectId,
      postedById: userId,
      city: project.city,
      state: project.state,
      latitude: project.latitude,
      longitude: project.longitude,
    },
  });

  void autoFlagIfSlur({
    text: [productionRequest.title, productionRequest.description].filter(Boolean).join(" "),
    targetType: "PRODUCTION_REQUEST",
    targetId: productionRequest.id,
  });

  return NextResponse.json(productionRequest, { status: 201 });
}
