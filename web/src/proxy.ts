import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { VISITOR_COOKIE } from "@/lib/visitor";
import { SHORT_SESSION_COOKIE, sessionCookieOptions, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

const publicPaths = new Set(["/", "/login", "/register", "/guest", "/forgot-password", "/reset-password", "/verify-email"]);

/**
 * Refreshes the Supabase session on every request, then sends visitors with no account and no
 * visitor cookie to Log in, remembering where they were headed. Visitors may open locked pages in place.
 * API routes are never redirected: each checks the caller itself and answers 401.
 *
 * Every response returned here must carry the cookies Supabase set in `setAll`, or a refreshed
 * session is lost and the user is signed out at random.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dev") && process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  let response = NextResponse.next({ request });
  const short = request.cookies.get(SHORT_SESSION_COOKIE)?.value === "1";

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, sessionCookieOptions(options, short));
        }
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Verifies the JWT and refreshes it when needed. Nothing may run between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const visitor = request.cookies.get(VISITOR_COOKIE)?.value === "1";

  if (!signedIn && !visitor && !publicPaths.has(pathname) && !pathname.startsWith("/books/") && !pathname.startsWith("/auth/") && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\..*).*)"],
};
