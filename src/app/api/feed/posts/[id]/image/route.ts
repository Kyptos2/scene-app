import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { MAX_IMAGE_BYTES, UnsupportedImageTypeError, storeImage } from "@/lib/storage";

// A second call after post creation (mirrors the project-poster flow) —
// keeps the JSON create endpoint simple and lets the client show upload
// progress separately from the text post itself.
export async function POST(request: Request, ctx: RouteContext<"/api/feed/posts/[id]/image">) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: postId } = await ctx.params;
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (post.authorId !== userId) {
    return NextResponse.json({ error: "Only the author can attach an image." }, { status: 403 });
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
    posterUrl = await storeImage(file, "feed", postId);
  } catch (err) {
    if (err instanceof UnsupportedImageTypeError) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    throw err;
  }

  await prisma.feedPost.update({ where: { id: postId }, data: { posterUrl } });

  return NextResponse.json({ posterUrl });
}
