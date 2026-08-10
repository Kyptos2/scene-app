import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const bodySchema = z.object({
  itemType: z.string().min(1).max(50),
  itemId: z.string().min(1),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { itemType, itemId } = parsed.data;

  const existing = await prisma.feedApplause.findUnique({
    where: { userId_itemType_itemId: { userId, itemType, itemId } },
  });

  if (existing) {
    await prisma.feedApplause.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedApplause.create({ data: { userId, itemType, itemId } });
  }

  const count = await prisma.feedApplause.count({ where: { itemType, itemId } });

  return NextResponse.json({ applauded: !existing, count });
}
