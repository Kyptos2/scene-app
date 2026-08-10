import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { findOrCreateOAuthUser, verifyAppleIdentityToken } from "@/lib/oauth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const bodySchema = z.object({
  identityToken: z.string().min(1),
  // Apple only includes the user's name in its native response on the
  // very first authorization — the client passes it through here since
  // the identity token itself never carries it.
  fullName: z.string().trim().max(200).nullable().optional(),
});

export async function POST(request: Request) {
  if (!checkRateLimit(`oauth-apple:${getClientIp(request)}`, 20, 15 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyAppleIdentityToken(parsed.data.identityToken);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid Apple token." }, { status: 401 });
  }

  const user = await findOrCreateOAuthUser(identity, parsed.data.fullName);
  const token = await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, token });
}
