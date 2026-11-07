import { supabase } from "@/lib/supabase";

/** Web app origin the phone can reach (EXPO_PUBLIC_API_URL), without a trailing slash. */
export function apiBase(): string | null {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim();
  return value ? value.replace(/\/$/, "") : null;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string; message: string };

/**
 * Calls the web app's REST API with the signed-in user's access token as a Bearer token.
 * The server verifies the token; the app never sends a user id.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const base = apiBase();
  if (!base) {
    return { ok: false, status: 0, code: "NO_API_URL", message: "The app isn't connected to the server yet (EXPO_PUBLIC_API_URL is empty)." };
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, status: 401, code: "UNAUTHENTICATED", message: "Log in again to continue." };

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const body = (await response.json().catch(() => null)) as
      | (T & { error?: { code?: string; message?: string } })
      | null;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: body?.error?.code ?? "HTTP_ERROR",
        message: body?.error?.message ?? "Something went wrong. Try again.",
      };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, code: "OFFLINE", message: "Couldn't reach the server. Check your connection." };
  }
}
