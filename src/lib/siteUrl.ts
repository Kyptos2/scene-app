// This Next.js app's own origin — distinct from APP_URL (src/lib/verification.ts,
// forgot-password route), which points at the mobile web build instead.
// Used to turn relative upload paths (/uploads/avatars/x.png) into the
// absolute URLs Open Graph images require.
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${WEB_ORIGIN}${path}`;
}
