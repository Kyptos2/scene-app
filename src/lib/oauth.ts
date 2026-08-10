import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { generateUsername } from "@/lib/username";
import type { User } from "@/generated/prisma/client";

export type OAuthProvider = "google" | "apple";

export type OAuthIdentity = {
  provider: OAuthProvider;
  subject: string;
  email: string | null;
  name: string | null;
};

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// Configuration lives in env vars the deployer sets, never in code — see
// mobile/lib/oauth.ts for the matching client-side config and the README
// note on what to provision in each provider's console before these can
// verify anything. Until then these throw a clear "not configured" error
// rather than silently failing signature checks.
function googleClientIds(): string[] {
  return (process.env.GOOGLE_OAUTH_CLIENT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function appleAudiences(): string[] {
  // Bundle ID for native sign-in, plus an optional Services ID for the
  // web-based flow — Apple issues tokens with `aud` set to whichever one
  // initiated the request.
  return [process.env.APPLE_BUNDLE_ID, process.env.APPLE_SERVICES_ID].filter((v): v is string => !!v);
}

export async function verifyGoogleIdToken(idToken: string): Promise<OAuthIdentity> {
  const audience = googleClientIds();
  if (audience.length === 0) {
    throw new Error("Google sign-in is not configured (set GOOGLE_OAUTH_CLIENT_IDS).");
  }
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience,
  });
  if (typeof payload.sub !== "string") {
    throw new Error("Google token is missing a subject claim.");
  }
  return {
    provider: "google",
    subject: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<OAuthIdentity> {
  const audience = appleAudiences();
  if (audience.length === 0) {
    throw new Error("Apple sign-in is not configured (set APPLE_BUNDLE_ID).");
  }
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience,
  });
  if (typeof payload.sub !== "string") {
    throw new Error("Apple token is missing a subject claim.");
  }
  return {
    provider: "apple",
    subject: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    // Apple's identity token never carries a display name — the client
    // only receives one from `AppleAuthentication.signInAsync()` on the
    // user's very first authorization, and passes it separately.
    name: null,
  };
}

// Finds the account already linked to this provider identity, links this
// identity onto a matching-email password account (Apple/Google email
// verification stands in for our own), or creates a fresh account.
export async function findOrCreateOAuthUser(identity: OAuthIdentity, fallbackName?: string | null): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { oauthProvider_oauthId: { oauthProvider: identity.provider, oauthId: identity.subject } },
  });
  if (existing) return existing;

  if (identity.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      return prisma.user.update({
        where: { id: byEmail.id },
        data: { oauthProvider: identity.provider, oauthId: identity.subject },
      });
    }
  }

  if (!identity.email) {
    throw new Error("No email was provided by the identity provider — can't create an account.");
  }

  const name = (fallbackName || identity.name || identity.email.split("@")[0]).trim() || "Filmmaker";
  const username = await generateUsername(name);

  return prisma.user.create({
    data: {
      email: identity.email,
      name,
      username,
      oauthProvider: identity.provider,
      oauthId: identity.subject,
      emailVerifiedAt: new Date(),
    },
  });
}
