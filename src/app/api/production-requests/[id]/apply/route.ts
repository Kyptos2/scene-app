import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { Prisma } from "@/generated/prisma/client";

const bodySchema = z.object({
  message: z.string().max(500).nullable().optional(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/production-requests/[id]/apply">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!checkRateLimit(`apply:${userId}`, 20, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const { id: productionRequestId } = await ctx.params;
  const productionRequest = await prisma.productionRequest.findUnique({
    where: { id: productionRequestId },
  });
  if (!productionRequest) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (productionRequest.postedById === userId) {
    return NextResponse.json({ error: "You can't apply to your own crew call." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const application = await prisma.crewCallApplication.create({
      data: { productionRequestId, applicantId: userId, message: parsed.data.message ?? null },
    });
    const applicant = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    void sendPushToUser(productionRequest.postedById, {
      title: "New crew call applicant",
      body: `${applicant?.name ?? "Someone"} applied to "${productionRequest.title}"`,
      data: { type: "crew_call_application", productionRequestId },
    });
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, alreadyApplied: true });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/production-requests/[id]/apply">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: productionRequestId } = await ctx.params;
  await prisma.crewCallApplication.deleteMany({ where: { productionRequestId, applicantId: userId } });
  return NextResponse.json({ ok: true });
}
