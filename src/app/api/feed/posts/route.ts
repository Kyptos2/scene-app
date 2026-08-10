import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { autoFlagIfSlur } from "@/lib/moderation";

const ANNOUNCEMENT_KINDS = ["wrap", "poster_reveal", "production_launch", "award"] as const;
const ALL_KINDS = [...ANNOUNCEMENT_KINDS, "project_launch"] as const;

const createSchema = z.object({
  kind: z.enum(ALL_KINDS),
  headline: z.string().min(1).max(200),
  body: z.string().max(2000).nullable().optional(),
  projectId: z.string().nullable().optional(),
  logline: z.string().max(500).nullable().optional(),
  seekingFeedback: z.boolean().optional(),
  seekingFestivalPartner: z.boolean().optional(),
});

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!checkRateLimit(`feed-post:${userId}`, 10, 60 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, ...rest } = parsed.data;

  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.ownerId !== userId) {
      return NextResponse.json({ error: "You can only post about your own projects." }, { status: 403 });
    }
  }

  const post = await prisma.feedPost.create({
    data: { ...rest, projectId: projectId ?? null, authorId: userId },
  });

  void autoFlagIfSlur({
    text: [post.headline, post.body, post.logline].filter(Boolean).join(" "),
    targetType: "FEED_POST",
    targetId: post.id,
  });

  return NextResponse.json(post, { status: 201 });
}
