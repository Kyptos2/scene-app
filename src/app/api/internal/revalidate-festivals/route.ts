import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Triggered on a schedule (Vercel Cron in production, a local node-cron /
// setInterval worker in dev) — never called from the mobile/web client, so
// it's deliberately left out of proxy.ts's CORS matcher.
//
// Protected by CRON_SECRET when set. Left open in local dev (no secret
// configured yet) so it can be exercised manually while building it out —
// tighten this before any real deployment.
const CHECK_TIMEOUT_MS = 8000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Verified against the real FilmFreeway.com: it 403s every automated
// request regardless of headers (Cloudflare-level bot protection), so a
// blocked response is not proof the listing is dead. Only a genuinely
// unreachable host, a request timeout, or an explicit 404/5xx counts as
// "broken" — a 403/429 records as null (inconclusive) rather than false,
// so a live FilmFreeway page never gets permanently mislabeled.
async function checkUrl(url: string): Promise<boolean | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const headers = { "User-Agent": BROWSER_USER_AGENT };
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal, headers });
    if (res.status === 405 || res.status === 501) {
      // Some servers don't support HEAD — retry with GET.
      res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal, headers });
    }
    if (res.ok) return true;
    if (res.status === 403 || res.status === 429) return null;
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const provided = request.headers.get("x-cron-secret");
    if (provided !== cronSecret) {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
  }

  const festivals = await prisma.festival.findMany({
    where: { submissionUrl: { not: null } },
    select: { id: true, submissionUrl: true },
  });

  const results = await Promise.all(
    festivals.map(async (f) => {
      const reachable = await checkUrl(f.submissionUrl as string);
      await prisma.festival.update({
        where: { id: f.id },
        data: { urlReachable: reachable, urlLastCheckedAt: new Date() },
      });
      return { id: f.id, submissionUrl: f.submissionUrl, reachable };
    }),
  );

  return NextResponse.json({ checked: results.length, results });
}
