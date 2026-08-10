import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateRawToken, hashToken } from "@/lib/tokens";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const APP_URL = process.env.APP_URL ?? "http://localhost:8081";

const schema = z.object({ email: z.string().email() });

// Always returns the same generic response whether or not the email exists,
// so this endpoint can't be used to enumerate registered accounts.
const GENERIC_RESPONSE = { message: "If that email has an account, we've sent a reset link." };

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!checkRateLimit(`forgot-password:${getClientIp(request)}:${parsed.data.email}`, 3, 60 * 60 * 1000)) {
    // Same generic response even when rate-limited — otherwise a 429 here
    // would itself confirm the email exists (it only rate-limits after
    // the very small number of legitimate resend attempts an owner needs).
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const rawToken = generateRawToken();
  await prisma.$transaction([
    // Invalidate any earlier outstanding reset links for this account.
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your SCENE password",
    text: `Hi ${user.name},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: `<p>Hi ${user.name},</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
  });

  return NextResponse.json(GENERIC_RESPONSE);
}
