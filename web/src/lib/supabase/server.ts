import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SHORT_SESSION_COOKIE, sessionCookieOptions, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Per-request client acting as the signed-in user (RLS applies).
 * Server Components can't write cookies; the proxy refreshes the session instead, so the
 * write is skipped there. Server Actions and Route Handlers write normally.
 */
export async function createClient() {
  const jar = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet) {
        const short = jar.get(SHORT_SESSION_COOKIE)?.value === "1";
        try {
          for (const { name, value, options } of cookiesToSet) {
            jar.set(name, value, sessionCookieOptions(options, short));
          }
        } catch {
          // Called from a Server Component. The proxy keeps the session fresh.
        }
      },
    },
  });
}
