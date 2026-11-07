import { NextResponse, type NextRequest } from "next/server";

import { verifyToken } from "@/lib/verification";

/**
 * GET /api/auth/verify?token=... — the link in the verification email.
 * Uses the token once, then shows the result page. Works without being signed in, so the link
 * can be opened on any device (for example the phone's browser for an Android account).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const status = await verifyToken(token);
  const result = new URL("/verify-email", request.url);
  result.searchParams.set("status", status);
  const response = NextResponse.redirect(result, 303);
  // Keep the token out of Referer headers and caches.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
