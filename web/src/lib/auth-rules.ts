/** Rules shared by the auth forms (client) and the server actions. No server-only imports here. */

export const PASSWORD_MIN = 8;
/** Caps the work one login can force on scrypt. */
export const PASSWORD_MAX = 128;

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
  return null;
}

/** Only same-site paths. Blocks "//evil.com", "/\evil.com" and absolute URLs. */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

/** Where a fresh sign-in lands. Readers never land in /admin; admins only land in /admin. */
export function landingFor(role: "user" | "admin", next: string | null): string {
  if (role === "admin") return next?.startsWith("/admin") ? next : "/admin";
  if (!next || next.startsWith("/admin") || isAuthPage(next)) return "/browse";
  return next;
}

function isAuthPage(path: string): boolean {
  return ["/login", "/register", "/forgot-password", "/reset-password", "/guest"].some(
    (page) => path === page || path.startsWith(`${page}?`) || path.startsWith(`${page}/`),
  );
}
