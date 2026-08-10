import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "feed");

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

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${postId}-${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  const posterUrl = `/uploads/feed/${filename}`;
  await prisma.feedPost.update({ where: { id: postId }, data: { posterUrl } });

  return NextResponse.json({ posterUrl });
}
