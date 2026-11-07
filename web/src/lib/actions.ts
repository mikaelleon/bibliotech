"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";

import { setFavorite, setInLibrary } from "@/lib/records";
import { clearSession, getSession, setGuestSession, setUserSession } from "@/lib/session";
import { emailPattern, landingFor, passwordProblem, safeNext } from "@/lib/auth-rules";
import { blockedFor, clear, clientIp, hit, limits, waitMessage } from "@/lib/rate-limit";
import { createResetToken, readResetToken } from "@/lib/reset-token";
import { createUser, findUser, updateDisplayName, updatePassword, verifyUser } from "@/lib/users";

export type LoginState = { error?: string } | null;

export type RegisterState = {
  errors?: { name?: string; email?: string; password?: string; form?: string };
  values?: { name: string; email: string };
} | null;

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email and password." };

  const emailKey = `login:email:${email.toLowerCase()}`;
  const ipKey = `login:ip:${await clientIp()}`;
  const wait = Math.max(blockedFor(emailKey, limits.loginEmail), blockedFor(ipKey, limits.loginIp));
  if (wait) return { error: waitMessage(wait) };

  const user = await verifyUser(email, password);
  if (!user) {
    hit(emailKey, limits.loginEmail);
    hit(ipKey, limits.loginIp);
    return { error: "Incorrect email or password." };
  }

  clear(emailKey);
  await setUserSession(user, remember);
  redirect(landingFor(user.role, next));
}

export async function registerAction(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  const errors: NonNullable<RegisterState>["errors"] = {};

  if (!name) errors.name = "Enter a display name.";
  if (!emailPattern.test(email)) errors.email = "Enter a valid email, like name@example.com.";
  const problem = passwordProblem(password);
  if (problem) errors.password = problem;
  if (errors.name || errors.email || errors.password) return { errors, values: { name, email } };

  const ipKey = `register:ip:${await clientIp()}`;
  const wait = blockedFor(ipKey, limits.register);
  if (wait) return { errors: { form: waitMessage(wait) }, values: { name, email } };
  hit(ipKey, limits.register);

  const result = await createUser(name, email, password);
  if (result.error || !result.user) {
    return { errors: { email: result.error }, values: { name, email } };
  }

  await setUserSession(result.user, true);
  redirect(landingFor("user", next));
}

/** Same answer whether or not the account exists, so the form can't be used to find accounts. */
export async function requestPasswordResetAction(email: string): Promise<{ error?: string }> {
  const address = email.trim();
  if (!emailPattern.test(address)) return { error: "Enter a valid email, like name@example.com." };

  const emailKey = `reset:email:${address.toLowerCase()}`;
  const ipKey = `reset:ip:${await clientIp()}`;
  const wait = Math.max(blockedFor(emailKey, limits.resetRequest), blockedFor(ipKey, limits.resetRequest));
  if (wait) return { error: waitMessage(wait) };
  hit(emailKey, limits.resetRequest);
  hit(ipKey, limits.resetRequest);

  const user = await findUser(address);
  if (user) {
    const link = `${await appOrigin()}/reset-password?token=${createResetToken(user)}`;
    deliverResetLink(user.email, link);
  }
  return {};
}

export async function resetPasswordAction(
  token: string,
  password: string,
  confirm: string,
): Promise<string | null> {
  const problem = passwordProblem(password);
  if (problem) return problem;
  if (password !== confirm) return "Those passwords don't match.";
  const user = await readResetToken(token);
  if (!user) return "This reset link has expired. Request a new one.";
  return updatePassword(user.email, password);
}

/** Never built from the Host header in production: that would let anyone poison reset links. */
async function appOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set.");
  const list = await headers();
  return `${list.get("x-forwarded-proto") ?? "http"}://${list.get("host") ?? "localhost:3000"}`;
}

/**
 * There is no mail service in this repo yet. In development the link goes to the server
 * console so the flow can be tested end to end. Production must plug a sender in here.
 */
function deliverResetLink(email: string, link: string) {
  if (process.env.NODE_ENV === "production") {
    console.warn(`[auth] Password reset requested for ${email}, but no mail sender is configured.`);
    return;
  }
  console.info(`[auth] Password reset link for ${email}: ${link}`);
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

/** Landing search. A visitor with no cookie continues as a guest, then sees results. */
export async function landingSearchAction(formData: FormData) {
  const query = String(formData.get("q") ?? "").trim();
  const session = await getSession();
  if (session.kind === "user" && session.role === "admin") redirect("/admin");
  if (session.kind === "none") await setGuestSession();
  redirect(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
}

export type ShelfResult = { ok: true; on: boolean } | { ok: false };

/** Readers only: guests have no shelves, and administrators don't read. */
async function readerEmail(): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user" || session.role === "admin") return null;
  return session.email;
}

/** Sets the favorite to exactly `on`. `at` restores its old position on Undo. */
export async function setFavoriteAction(bookId: string, on: boolean, at?: number): Promise<ShelfResult> {
  const email = await readerEmail();
  if (!email) return { ok: false };
  await setFavorite(email, bookId, on, at);
  // Every reader page can show this book's heart or shelf state.
  revalidatePath("/", "layout");
  return { ok: true, on };
}

/** Adds the book to, or removes it from, Library. Never uses a download. */
export async function setLibraryAction(bookId: string, on: boolean, addedAt?: string): Promise<ShelfResult> {
  const email = await readerEmail();
  if (!email) return { ok: false };
  await setInLibrary(email, bookId, on, addedAt);
  revalidatePath("/", "layout");
  return { ok: true, on };
}

export async function updateNameAction(name: string): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user") return "Log in to change your name.";
  const error = await updateDisplayName(session.email, name);
  if (!error) {
    revalidatePath("/profile");
    revalidatePath("/admin/account");
  }
  return error;
}

export async function updatePasswordAction(password: string, confirm: string): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user") return "Log in to change your password.";
  const problem = passwordProblem(password);
  if (problem) return problem;
  if (password !== confirm) return "Those passwords don't match.";
  return updatePassword(session.email, password);
}
