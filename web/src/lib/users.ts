import { createHash, randomBytes, scrypt, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";

import { PASSWORD_MAX, passwordProblem } from "@/lib/auth-rules";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export type StoredUser = {
  email: string;
  name: string;
  role: "user" | "admin";
  downloadsUsed: number;
  passwordHash: string;
  passwordSalt: string;
};

/**
 * Local stand-in for the account table. There is no database in this repo.
 * Seeded reader: dane@elibrary.local / library1. Role is user, not admin.
 * Seeded admin: admin@elibrary.local / admin1234.
 */
const filePath = path.join(process.cwd(), "data", "users.json");

async function readUsers(): Promise<StoredUser[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(users, null, 2)}\n`, "utf8");
}

/** Async so a login doesn't block every other request while scrypt runs. */
async function hashPassword(password: string, salt: string): Promise<string> {
  return (await scryptAsync(password, salt, 32)).toString("hex");
}

/** Hashed when the email is unknown, so a miss takes as long as a wrong password. */
const dummySalt = randomBytes(16).toString("hex");

/** Changes whenever the password does. Reset links carry it, so each link works once. */
export function passwordFingerprint(user: StoredUser): string {
  return createHash("sha256").update(user.passwordHash).digest("base64url").slice(0, 16);
}

export async function findUser(email: string): Promise<StoredUser | undefined> {
  const users = await readUsers();
  const key = email.trim().toLowerCase();
  return users.find((user) => user.email === key);
}

export async function verifyUser(
  email: string,
  password: string,
): Promise<StoredUser | undefined> {
  if (password.length > PASSWORD_MAX) return undefined;
  const user = await findUser(email);
  if (!user) {
    await hashPassword(password, dummySalt);
    return undefined;
  }

  const actual = Buffer.from(await hashPassword(password, user.passwordSalt), "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
  return user;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<{ user?: StoredUser; error?: string }> {
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  const users = await readUsers();
  const key = email.trim().toLowerCase();
  if (users.some((user) => user.email === key)) {
    return { error: "An account with that email already exists." };
  }

  const salt = randomBytes(16).toString("hex");
  const user: StoredUser = {
    email: key,
    name: name.trim(),
    role: "user",
    downloadsUsed: 0,
    passwordSalt: salt,
    passwordHash: await hashPassword(password, salt),
  };

  users.push(user);
  await writeUsers(users);
  return { user };
}

export async function listUsers(): Promise<StoredUser[]> {
  return readUsers();
}

/** Changes the display name only. Role is never written here. */
export async function updateDisplayName(email: string, name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return "Enter a display name.";
  const users = await readUsers();
  const user = users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) return "That account is not available.";
  user.name = trimmed;
  await writeUsers(users);
  return null;
}

/** Replaces the password. Role is never written here. */
export async function updatePassword(email: string, password: string): Promise<string | null> {
  const problem = passwordProblem(password);
  if (problem) return problem;
  const users = await readUsers();
  const user = users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) return "That account is not available.";
  user.passwordSalt = randomBytes(16).toString("hex");
  user.passwordHash = await hashPassword(password, user.passwordSalt);
  await writeUsers(users);
  return null;
}
