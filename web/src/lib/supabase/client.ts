"use client";

import { createBrowserClient } from "@supabase/ssr";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

/** Browser client for client components. Acts as the signed-in user; RLS applies. */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
