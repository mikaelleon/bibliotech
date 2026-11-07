import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, readSessionToken } from "@/lib/session-token";

const publicPaths = new Set(["/", "/login", "/register", "/guest", "/forgot-password", "/reset-password"]);

/** Send visitors with no valid cookie to Log in, remembering where they were headed. Guests may open locked pages in place. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/dev") && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  if (!token && !publicPaths.has(pathname) && !pathname.startsWith("/books/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
