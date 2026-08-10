import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { PROFILE_INCLUDE, toPublicUser } from "@/lib/serializers";
import { autoFlagIfSlur } from "@/lib/moderation";
import { FilmRole, ExperienceLevel } from "@/generated/prisma/enums";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(160).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  primaryRoles: z.array(z.enum(FilmRole)).optional(),
  experienceLevel: z.enum(ExperienceLevel).optional(),
  availabilityStatus: z.string().trim().max(40).nullable().optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: PROFILE_INCLUDE,
  });
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json(toPublicUser(user));
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
    include: PROFILE_INCLUDE,
  });

  if (parsed.data.bio !== undefined || parsed.data.tagline !== undefined) {
    void autoFlagIfSlur({
      text: [user.bio, user.tagline].filter(Boolean).join(" "),
      targetType: "USER",
      targetId: user.id,
    });
  }

  return NextResponse.json(toPublicUser(user));
}
