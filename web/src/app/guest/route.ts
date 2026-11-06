import { NextResponse } from "next/server";

import { getSession, setGuestSession } from "@/lib/session";

/** Continue as guest. Does not replace an account that is already signed in. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/browse";
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getSession();
  if (session.kind === "none") await setGuestSession();
  return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), request.url));
}
