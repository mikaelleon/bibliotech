import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "@/lib/supabase/env";

/**
 * Secret-key client. Bypasses RLS, so only call it after the caller has been checked
 * (for example `isAdminSession`). Never import this from a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set. See web/.env.example.");
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
