import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class UnsupportedImageTypeError extends Error {}

// Stores an uploaded image and returns a URL the client can load directly.
// Uses Supabase Storage when configured (SUPABASE_URL + SUPABASE_SERVICE_
// ROLE_KEY set, the case in production — Vercel's filesystem is ephemeral,
// so local writes wouldn't survive past the request); falls back to
// public/uploads on local disk otherwise, matching the original dev
// behavior. Both return forms are already handled by the mobile client's
// resolveAvatarUrl, which passes absolute URLs through untouched and
// prefixes relative ones with the API base — no client changes needed.
export async function storeImage(file: File, folder: string, keyPrefix: string): Promise<string> {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new UnsupportedImageTypeError(file.type);
  }

  const filename = `${keyPrefix}-${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const objectPath = `${folder}/${filename}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!res.ok) {
      throw new Error(`Supabase Storage upload failed (${res.status}): ${await res.text()}`);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return `/uploads/${folder}/${filename}`;
}
