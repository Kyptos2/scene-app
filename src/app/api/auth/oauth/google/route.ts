import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { findOrCreateOAuthUser, verifyGoogleIdToken } from "@/lib/oauth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const bodySchema = z.object({ idToken: z.string().min(1) });

export async function POST(request: Request) {
  if (!checkRateLimit(`oauth-google:${getClientIp(request)}`, 20, 15 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(parsed.data.idToken);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid Google token." }, { status: 401 });
  }

  const user = await findOrCreateOAuthUser(identity);
  const token = await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, token });
}
