import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { MAX_IMAGE_BYTES, UnsupportedImageTypeError, storeImage } from "@/lib/storage";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[id]/poster">) {
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
    return NextResponse.json({ error: "Only the project owner can set a poster." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  let posterUrl: string;
  try {
    posterUrl = await storeImage(file, "posters", projectId);
  } catch (err) {
    if (err instanceof UnsupportedImageTypeError) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    throw err;
  }

  await prisma.project.update({ where: { id: projectId }, data: { posterUrl } });

  return NextResponse.json({ posterUrl });
}
