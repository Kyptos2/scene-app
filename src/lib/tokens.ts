import "server-only";
import { randomBytes, createHash } from "node:crypto";

// The raw token goes out in an email link; only its hash is ever stored, so
// a database read (or leak) can't be used to reset a password or forge a
// verification link.
export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
