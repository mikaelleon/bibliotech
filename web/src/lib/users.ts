import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
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
  const user = await findUser(email);
  if (!user) return undefined;

  const actual = Buffer.from(hashPassword(password, user.passwordSalt), "hex");
  const expected = Buffer.from(user.passwordHash, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
  return user;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<{ user?: StoredUser; error?: string }> {
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
    passwordHash: hashPassword(password, salt),
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
  if (password.length < 8) return "Use at least 8 characters.";
  const users = await readUsers();
  const user = users.find((item) => item.email === email.trim().toLowerCase());
  if (!user) return "That account is not available.";
  user.passwordSalt = randomBytes(16).toString("hex");
  user.passwordHash = hashPassword(password, user.passwordSalt);
  await writeUsers(users);
  return null;
}
