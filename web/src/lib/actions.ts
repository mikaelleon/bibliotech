"use server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";

import { toggleFavorite } from "@/lib/records";
import { clearSession, getSession, setGuestSession, setUserSession } from "@/lib/session";
import { createUser, updateDisplayName, updatePassword, verifyUser } from "@/lib/users";

export type LoginState = { error?: string } | null;

export type RegisterState = {
  errors?: { name?: string; email?: string; password?: string; form?: string };
  values?: { name: string; email: string };
} | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyUser(email, password);

  if (!user) return { error: "Incorrect email or password." };

  await setUserSession(user);
  redirect("/browse");
}

export async function registerAction(
  _state: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const errors: NonNullable<RegisterState>["errors"] = {};

  if (!name) errors.name = "Enter a display name.";
  if (!emailPattern.test(email)) errors.email = "Enter a valid email, like name@example.com.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (errors.name || errors.email || errors.password) return { errors, values: { name, email } };

  const result = await createUser(name, email, password);
  if (result.error || !result.user) {
    return { errors: { email: result.error }, values: { name, email } };
  }

  await setUserSession(result.user);
  redirect("/browse");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}

/** Landing search. A visitor with no cookie continues as a guest, then sees results. */
export async function landingSearchAction(formData: FormData) {
  const query = String(formData.get("q") ?? "").trim();
  const session = await getSession();
  if (session.kind === "none") await setGuestSession();
  redirect(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
}

export async function toggleFavoriteAction(bookId: string): Promise<{ ok: true; active: boolean } | { ok: false }> {
  const session = await getSession();
  if (session.kind !== "user") return { ok: false };
  const active = await toggleFavorite(session.email, bookId);
  revalidatePath("/favorites");
  revalidatePath(`/books/${bookId}`);
  return { ok: true, active };
}

export async function updateNameAction(name: string): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user") return "Log in to change your name.";
  const error = await updateDisplayName(session.email, name);
  if (!error) revalidatePath("/profile");
  return error;
}

export async function updatePasswordAction(password: string, confirm: string): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user") return "Log in to change your password.";
  if (password.length < 8) return "Use at least 8 characters.";
  if (password !== confirm) return "Those passwords don't match.";
  return updatePassword(session.email, password);
}
