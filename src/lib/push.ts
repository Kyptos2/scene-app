import "server-only";
import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Expo's push service needs no API key for its default rate limits — a
// single POST per batch of tokens. A failed push is a side effect, never
// the reason the triggering request (an application, a message, etc.)
// should fail, so this never throws.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
  if (tokens.length === 0) return;
  await sendExpoPush(tokens.map((t) => t.token), payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return;
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: uniqueIds } },
    select: { token: true },
  });
  if (tokens.length === 0) return;
  await sendExpoPush(tokens.map((t) => t.token), payload);
}

async function sendExpoPush(tokens: string[], payload: PushPayload): Promise<void> {
  const messages = tokens.map((to) => ({ to, title: payload.title, body: payload.body, data: payload.data }));
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.error(`Push send failed: ${res.status} ${await res.text().catch(() => "")}`);
    }
  } catch (err) {
    console.error("Push send failed:", err);
  }
}
