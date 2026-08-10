import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { sendPushToUsers } from "@/lib/push";

const updateSchema = z.object({
  isFilled: z.boolean(),
});

const DETAIL_INCLUDE = {
  project: { select: { id: true, title: true, ownerId: true } },
  applications: {
    include: {
      applicant: {
        select: { id: true, name: true, username: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/production-requests/[id]">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const productionRequest = await prisma.productionRequest.findUnique({
    where: { id },
    include: DETAIL_INCLUDE,
  });
  if (!productionRequest) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (productionRequest.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  return NextResponse.json(productionRequest);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/production-requests/[id]">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const productionRequest = await prisma.productionRequest.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!productionRequest) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (productionRequest.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.productionRequest.update({
    where: { id },
    data: parsed.data,
    include: DETAIL_INCLUDE,
  });

  if (parsed.data.isFilled && !productionRequest.isFilled && updated.applications.length > 0) {
    void sendPushToUsers(
      updated.applications.map((a) => a.applicant.id),
      {
        title: "Crew call filled",
        body: `"${updated.title}" has been filled.`,
        data: { type: "crew_call_filled", productionRequestId: id },
      }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/production-requests/[id]">
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const productionRequest = await prisma.productionRequest.findUnique({
    where: { id },
    include: { project: true },
  });
  if (!productionRequest) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (productionRequest.project.ownerId !== userId) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await prisma.productionRequest.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
