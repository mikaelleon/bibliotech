import { NextResponse } from "next/server";

import { setGuestSession } from "@/lib/session";

/** Continue as guest. Replaces a signed-in account so the button always opens a guest session. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/browse";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  await setGuestSession();
  return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), request.url));
}
