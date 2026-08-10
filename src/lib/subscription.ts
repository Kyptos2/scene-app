import { prisma } from "@/lib/prisma";

// Festivals is the one feature Free doesn't get. Centralized here so every
// gated route checks the same way rather than re-deriving "is this user
// Gold" inline.
export async function requireGoldTier(userId: string): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionTier: true } });
  if (!user) {
    return { ok: false, status: 404, body: { error: "Not found." } };
  }
  if (user.subscriptionTier !== "GOLD") {
    return {
      ok: false,
      status: 403,
      body: { error: "Festival access requires the Gold plan.", code: "GOLD_REQUIRED" },
    };
  }
  return { ok: true };
}
