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

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123",
  "qwertyuiop", "iloveyou", "letmein1", "welcome1", "admin123", "abc12345", "11111111",
]);

export type PasswordStrength = { level: 0 | 1 | 2 | 3 | 4; label: string };

/** Advisory only. The server still enforces passwordProblem and nothing else. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { level: 0, label: "" };
  if (password.length < PASSWORD_MIN) return { level: 1, label: "Too short" };
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password)) return { level: 1, label: "Too common" };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  const points = (password.length >= 12 ? 1 : 0) + (password.length >= 16 ? 1 : 0) + (classes >= 3 ? 1 : 0);
  const level = (1 + points) as 1 | 2 | 3 | 4;
  return { level, label: ["Weak", "Fair", "Good", "Strong"][level - 1] };
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
