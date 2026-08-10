import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { autoFlagIfSlur } from "@/lib/moderation";
import { ProjectStatus, FilmRole } from "@/generated/prisma/enums";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  genre: z.string().max(100).nullable().optional(),
  status: z.enum(ProjectStatus).optional(),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  logline: z.string().max(1000).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  ownerRole: z.enum(FilmRole).nullable().optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      title: true,
      genre: true,
      releaseYear: true,
      status: true,
      logline: true,
      posterUrl: true,
      catalogStatus: true,
      credits: {
        where: { isVerified: true },
        select: { user: { select: { id: true, avatarUrl: true } } },
        take: 8,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const results = projects.map(({ credits, ...rest }) => {
    const seen = new Set<string>();
    const crew = credits.filter((c) => (seen.has(c.user.id) ? false : (seen.add(c.user.id), true)));
    return {
      ...rest,
      crewAvatars: crew.map((c) => c.user.avatarUrl),
      crewCount: crew.length,
    };
  });

  return NextResponse.json({ results });
}

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

  const { ownerRole, ...projectData } = parsed.data;

  const project = await prisma.project.create({
    data: {
      ...projectData,
      ownerId: userId,
      credits: ownerRole
        ? {
            create: {
              userId,
              role: ownerRole,
              isVerified: true,
              verifiedById: userId,
              verifiedAt: new Date(),
            },
          }
        : undefined,
    },
    include: { credits: true },
  });

  void autoFlagIfSlur({
    text: [project.title, project.logline].filter(Boolean).join(" "),
    targetType: "PROJECT",
    targetId: project.id,
  });

  return NextResponse.json(project, { status: 201 });
}
