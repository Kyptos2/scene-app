import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const registerSchema = z.object({
  token: z.string().trim().min(1),
  platform: z.string().trim().max(20).nullable().optional(),
});

// POST /api/push-tokens — registers (or reassigns) an Expo push token for
// the caller. Upserting on the unique token lets the same device move
// between accounts (logout/login) without leaving a stale owner behind.
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { token, platform } = parsed.data;
  await prisma.pushToken.upsert({
    where: { token },
    create: { userId, token, platform: platform ?? null },
    update: { userId, platform: platform ?? null },
  });

  return NextResponse.json({ ok: true });
}

const unregisterSchema = z.object({ token: z.string().trim().min(1) });

// DELETE /api/push-tokens — unregisters a token, e.g. on logout, scoped to
// the caller so one user can't remove another's token.
export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = unregisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({ where: { userId, token: parsed.data.token } });
  return NextResponse.json({ ok: true });
}
