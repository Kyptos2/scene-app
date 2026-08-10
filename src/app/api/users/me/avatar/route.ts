import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { MAX_IMAGE_BYTES, UnsupportedImageTypeError, storeImage } from "@/lib/storage";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8MB)." }, { status: 400 });
  }

  let avatarUrl: string;
  try {
    avatarUrl = await storeImage(file, "avatars", userId);
  } catch (err) {
    if (err instanceof UnsupportedImageTypeError) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }
    // TEMPORARY: surfaces the real error for one-off production debugging —
    // reverted immediately after diagnosing the deploy issue.
    return NextResponse.json(
      { error: "DEBUG", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl });
}
