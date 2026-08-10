import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;
  if (!checkRateLimit(`login:${getClientIp(request)}:${email}`, 10, 15 * 60 * 1000)) {
    return rateLimitResponse();
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(
      { error: user && !user.passwordHash ? "This account signs in with Google or Apple." : "Invalid email or password." },
      { status: 401 },
    );
  }

  const token = await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, token });
}
