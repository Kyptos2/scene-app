import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

// No payment processor is wired in (no Stripe/etc. keys in this project).
// This validates the card fields look plausible — shape only, never a real
// authorization — then immediately discards them. Nothing card-related is
// persisted or logged anywhere; only the resulting tier is written. Swap
// the body of the POST handler for a real charge + webhook flow once a
// processor is configured; the read side (GET) and the rest of the app's
// gating logic won't need to change.
const luhnValid = (digits: string) => {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
};

const subscribeSchema = z.object({
  cardholderName: z.string().trim().min(1).max(200),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => /^\d{13,19}$/.test(v), "Enter a valid card number.")
    .refine(luhnValid, "Enter a valid card number."),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(new Date().getFullYear()),
  cvv: z.string().trim().refine((v) => /^\d{3,4}$/.test(v), "Enter a valid CVV."),
  billingZip: z.string().trim().min(3).max(12),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionUpdatedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { expiryMonth, expiryYear } = parsed.data;
  const now = new Date();
  const expiresAtEndOfMonth = new Date(expiryYear, expiryMonth, 0, 23, 59, 59);
  if (expiresAtEndOfMonth < now) {
    return NextResponse.json(
      { error: { fieldErrors: { expiryMonth: ["This card has expired."] } } },
      { status: 400 },
    );
  }

  // Card details end here — deliberately not read again below.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: "GOLD", subscriptionUpdatedAt: new Date() },
    select: { subscriptionTier: true, subscriptionUpdatedAt: true },
  });

  return NextResponse.json(user);
}

export async function DELETE() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { subscriptionTier: "FREE", subscriptionUpdatedAt: new Date() },
    select: { subscriptionTier: true, subscriptionUpdatedAt: true },
  });
  return NextResponse.json(user);
}
