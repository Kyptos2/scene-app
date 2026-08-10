import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/verification";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { generateUsername } from "@/lib/username";
import { Prisma } from "@/generated/prisma/client";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  if (!checkRateLimit(`signup:${getClientIp(request)}`, 5, 15 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const passwordHash = await hashPassword(password);
  const username = await generateUsername(name);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name, username },
    });
    const token = await createSession(user.id);
    // Verification is a soft-gated side effect — a delivery failure here
    // shouldn't turn a successful signup into a 500 for the caller.
    sendVerificationEmail(user).catch((err) => console.error("Failed to send verification email:", err));
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    throw error;
  }
}
