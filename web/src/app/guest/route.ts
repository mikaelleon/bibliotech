import { NextResponse } from "next/server";

import { safeNext } from "@/lib/auth-rules";
import { getSession, setGuestSession } from "@/lib/session";

function wantsJson(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function answer(request: Request, next: string) {
  if (wantsJson(request)) return NextResponse.json({ next });
  return NextResponse.redirect(new URL(next, request.url));
}

/** Continue as guest. Replaces a signed-in account so the button always opens a guest session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getSession();
  if (session.kind === "user" && session.role === "admin") {
    return answer(request, "/admin");
  }
  await setGuestSession();
  return answer(request, safeNext(url.searchParams.get("next")) ?? "/browse");
}
