import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { MAX_IMAGE_BYTES, UnsupportedImageTypeError, storeImage } from "@/lib/storage";

// A second call after festival creation (mirrors the project-poster and
// feed-image flows). Festivals aren't owned by a single creator in this
// schema — anyone who can list a festival can also set its artwork, same
// trust level as the create endpoint itself.
export async function POST(request: Request, ctx: RouteContext<"/api/festivals/[id]/poster">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: festivalId } = await ctx.params;
  const festival = await prisma.festival.findUnique({ where: { id: festivalId } });
  if (!festival) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
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
    posterUrl = await storeImage(file, "festivals", festivalId);
  } catch (err) {
    if (err instanceof UnsupportedImageTypeError) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }
    throw err;
  }

  await prisma.festival.update({ where: { id: festivalId }, data: { posterUrl } });

  return NextResponse.json({ posterUrl });
}
