import { NextResponse } from "next/server";

import { safeNext } from "@/lib/auth-rules";
import { getSession, setGuestSession } from "@/lib/session";

/** Continue as guest. Replaces a signed-in account so the button always opens a guest session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getSession();
  if (session.kind === "user" && session.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  await setGuestSession();
  return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")) ?? "/browse", request.url));
}
