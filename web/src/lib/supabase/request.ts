import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient as createCookieClient } from "@/lib/supabase/server";

export type RequestUser = {
  id: string;
  email: string;
  /** Acts as this user (RLS applies). */
  supabase: SupabaseClient;
};

/**
 * The caller of an API route. The Android app sends `Authorization: Bearer <access token>`;
 * the web app sends Supabase cookies. Either way the JWT is verified with getClaims().
 * The user id always comes from the verified token, never from the request body.
 */
export async function requestUser(request: Request): Promise<RequestUser | null> {
  const header = request.headers.get("authorization");
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (token) {
    const supabase = createSupabaseClient(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return { id: data.claims.sub, email: String(data.claims.email ?? ""), supabase };
  }

  const supabase = await createCookieClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return null;
  return { id: data.claims.sub, email: String(data.claims.email ?? ""), supabase };
}
