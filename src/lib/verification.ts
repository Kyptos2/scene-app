import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { generateRawToken, hashToken } from "@/lib/tokens";

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const APP_URL = process.env.APP_URL ?? "http://localhost:8081";

export async function sendVerificationEmail(user: { id: string; email: string; name: string }): Promise<void> {
  const rawToken = generateRawToken();
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    }),
  ]);

  const verifyUrl = `${APP_URL}/verify-email?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your SCENE email",
    text: `Hi ${user.name},\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Hi ${user.name},</p><p><a href="${verifyUrl}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
  });
}
