import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lets the mobile app's web target (and native app, which isn't subject to
// CORS at all) call these endpoints cross-origin. Mutations here are gated
// by the same bearer-token auth as same-origin requests — CORS only decides
// whether a *browser* JS client from another origin may attempt the call at
// all, not whether the server accepts it. Since these fetches never send
// credentials (no cookie crosses origins), a same-origin session can't be
// hijacked via this — a request without a valid token is just a normal 401.
const corsOptions = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const isPreflight = request.method === "OPTIONS";

  if (isPreflight) {
    return NextResponse.json(
      {},
      {
        headers: {
          "Access-Control-Allow-Origin": origin || "*",
          ...corsOptions,
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: [
    "/api/feed/:path*",
    "/api/users/:path*",
    "/api/auth/:path*",
    "/api/connections",
    "/api/projects/:path*",
    "/api/search/:path*",
    "/api/festivals/:path*",
    "/api/credits/:path*",
    "/api/production-requests/:path*",
    "/api/notifications/:path*",
    "/api/conversations/:path*",
    "/api/workspaces/:path*",
    "/api/catalog/:path*",
    "/api/reports/:path*",
    "/api/push-tokens",
    "/api/polls/:path*",
    "/api/workspace-invites/:path*",
  ],
};
