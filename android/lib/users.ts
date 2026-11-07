export type StoredUser = {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
  downloadsUsed: number;
};

/**
 * In-memory account stub. The repo has no database.
 * Seed logins match the web app: dane@elibrary.local / library1 (reader)
 * and admin@elibrary.local / admin1234 (admin). An administrator on Android
 * sees a notice and cannot open the reader tabs.
 * New accounts last until the process restarts.
 */
export const users: StoredUser[] = [
  {
    name: "Dane Peralta",
    email: "dane@elibrary.local",
    password: "library1",
    role: "user",
    downloadsUsed: 0,
  },
  {
    name: "Library Admin",
    email: "admin@elibrary.local",
    password: "admin1234",
    role: "admin",
    downloadsUsed: 0,
  },
];

export function findUser(email: string, password: string): StoredUser | undefined {
  const needle = email.trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === needle && user.password === password);
}

export function emailTaken(email: string): boolean {
  const needle = email.trim().toLowerCase();
  return users.some((user) => user.email.toLowerCase() === needle);
}

export function userByEmail(email: string): StoredUser | undefined {
  const needle = email.trim().toLowerCase();
  return users.find((user) => user.email.toLowerCase() === needle);
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
  return null;
}

/** Same thresholds as the web login: 5 wrong passwords per account per 15 minutes. */
const LOCK_MAX = 5;
const LOCK_WINDOW_MS = 15 * 60_000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function lockedFor(email: string): number {
  const entry = failures.get(email.trim().toLowerCase());
  const now = Date.now();
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count >= LOCK_MAX ? entry.resetAt - now : 0;
}

export function recordFailure(email: string): void {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + LOCK_WINDOW_MS });
  else entry.count += 1;
}

export function clearFailures(email: string): void {
  failures.delete(email.trim().toLowerCase());
}
