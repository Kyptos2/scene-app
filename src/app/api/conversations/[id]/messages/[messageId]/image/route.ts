import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { MAX_IMAGE_BYTES, UnsupportedImageTypeError, storeImage } from "@/lib/storage";

// A second call after message creation (mirrors the feed-post image flow)
// — the client creates an IMAGE-kind message first (so it appears in the
// thread immediately), then attaches the file here.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/conversations/[id]/messages/[messageId]/image">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id: conversationId, messageId } = await ctx.params;
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message || message.conversationId !== conversationId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (message.senderId !== userId) {
    return NextResponse.json({ error: "Only the sender can attach an image." }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  let imageUrl: string;
  try {
    imageUrl = await storeImage(file, "messages", messageId);
  } catch (err) {
    if (err instanceof UnsupportedImageTypeError) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 },
      );
    }
    throw err;
  }

  const updated = await prisma.message.update({ where: { id: messageId }, data: { imageUrl } });

  return NextResponse.json(updated);
}
