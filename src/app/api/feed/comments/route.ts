import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { autoFlagIfSlur } from "@/lib/moderation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const itemType = url.searchParams.get("itemType");
  const itemId = url.searchParams.get("itemId");
  if (!itemType || !itemId) {
    return NextResponse.json({ error: "itemType and itemId are required." }, { status: 400 });
  }

  const comments = await prisma.feedComment.findMany({
    where: { itemType, itemId },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const results = comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    authorId: c.user.id,
    authorName: c.user.name,
    authorHandle: c.user.username,
    authorAvatarUrl: c.user.avatarUrl,
  }));

  return NextResponse.json({ results });
}

const createSchema = z.object({
  itemType: z.string().min(1).max(50),
  itemId: z.string().min(1),
  body: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const comment = await prisma.feedComment.create({
    data: { userId, ...parsed.data },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
  });

  void autoFlagIfSlur({ text: comment.body, targetType: "FEED_COMMENT", targetId: comment.id });

  return NextResponse.json(
    {
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      authorId: comment.user.id,
      authorName: comment.user.name,
      authorHandle: comment.user.username,
      authorAvatarUrl: comment.user.avatarUrl,
    },
    { status: 201 },
  );
}
