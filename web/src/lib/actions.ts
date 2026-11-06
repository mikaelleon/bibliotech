"use server";

import { redirect } from "next/navigation";

import { clearSession, getSession, setGuestSession, setUserSession } from "@/lib/session";
import { createUser, verifyUser } from "@/lib/users";

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
  redirect(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse");
}
