import { prisma } from "@/lib/prisma";

// Shared by password signup and OAuth account creation — both need a
// unique @handle derived from a display name with no user input for it.
export async function generateUsername(name: string): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "filmmaker";
  let candidate = base;
  for (let attempt = 0; attempt < 10; attempt++) {
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  throw new Error("Could not generate a unique username.");
}
