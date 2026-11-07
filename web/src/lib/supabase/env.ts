/** Public values: safe in browser bundles. */
export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. See web/.env.example.");
  return value;
}

export function supabasePublishableKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set. See web/.env.example.");
  return value;
}

/**
 * Set (session cookie, no max-age) when the user signed in without "Keep me signed in".
 * Supabase's own auth cookies then lose their max-age too, so they end with the browser session.
 */
export const SHORT_SESSION_COOKIE = "elib_short";

type CookieOptionsLike = { maxAge?: number; expires?: Date; [key: string]: unknown };

/** Drops the lifetime from Supabase auth cookies for short sessions. Deletions (maxAge 0) pass through. */
export function sessionCookieOptions<T extends CookieOptionsLike>(options: T, short: boolean): T {
  if (!short || options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
