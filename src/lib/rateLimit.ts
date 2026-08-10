import "server-only";

type Bucket = { count: number; resetAt: number };

// In-memory fixed-window limiter. Good enough for a single-process deploy;
// it resets on restart and doesn't share state across instances, which is
// an acceptable tradeoff for "lightweight abuse protection" at this scale.
const buckets = new Map<string, Bucket>();

// Occasional sweep of expired entries so the map doesn't grow unbounded —
// piggybacks on real requests instead of a standing timer.
function sweep(now: number) {
  if (Math.random() > 0.01) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

// Returns true if the request is allowed, false if the caller is over the
// limit for this key within the current window.
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(): Response {
  return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
    status: 429,
    headers: { "Content-Type": "application/json" },
  });
}
