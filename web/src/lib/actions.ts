"use server";

import { redirect } from "next/navigation";

import { revalidatePath } from "next/cache";

import { setFavorite, setInLibrary } from "@/lib/records";
import { clearSession, getSession, setGuestSession, setSessionLength } from "@/lib/session";
import { emailPattern, landingFor, PASSWORD_MAX, passwordProblem, safeNext } from "@/lib/auth-rules";
import { blockedFor, clear, clientIp, hit, limits, waitMessage } from "@/lib/rate-limit";
import { appOrigin } from "@/lib/app-origin";
import { disposableMessage, isDisposableEmail } from "@/lib/disposable-domains";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, sendVerification } from "@/lib/verification";

export type LoginState = { error?: string } | null;

export type RegisterState = {
  errors?: { name?: string; email?: string; password?: string; terms?: string; form?: string };
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

  if (password.length > PASSWORD_MAX) return { error: "Incorrect email or password." };

  await setSessionLength(remember);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    hit(emailKey, limits.loginEmail);
    hit(ipKey, limits.loginIp);
    // Same message for an unknown email and a wrong password, so the form can't find accounts.
    return { error: "Incorrect email or password." };
  }

  clear(emailKey);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  redirect(landingFor(profile?.role === "admin" ? "admin" : "user", next));
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
  else if (isDisposableEmail(email)) errors.email = disposableMessage;
  const problem = passwordProblem(password);
  if (problem) errors.password = problem;
  if (formData.get("terms") !== "on") errors.terms = "Agree to the Terms and Conditions and Privacy Policy.";
  if (errors.name || errors.email || errors.password || errors.terms) return { errors, values: { name, email } };

  const ipKey = `register:ip:${await clientIp()}`;
  const wait = blockedFor(ipKey, limits.register);
  if (wait) return { errors: { form: waitMessage(wait) }, values: { name, email } };
  hit(ipKey, limits.register);

  await setSessionLength(true);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { errors: { email: "An account with that email already exists." }, values: { name, email } };
    }
    if (error.code === "weak_password") {
      return { errors: { password: error.message }, values: { name, email } };
    }
    console.error("[auth] sign-up failed", error.code, error.message);
    return { errors: { form: "We couldn't create your account. Try again in a moment." }, values: { name, email } };
  }
  // Confirm email is off on the project, so sign-up returns a session straight away.
  if (!data.session) {
    return { errors: { form: "Your account was created. Log in to continue." }, values: { name, email } };
  }

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

  // Supabase sends the email (custom SMTP in production). The link lands on /auth/callback,
  // which signs the user in for this one purpose and opens /reset-password.
  const supabase = await createClient();
  const redirectTo = `${await appOrigin()}/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo });
  if (error) {
    console.error("[auth] reset email failed", error.code, error.message);
    if (error.status === 429) return { error: "Too many reset emails. Try again later." };
  }
  return {};
}

/** The reset link signed the user in through /auth/callback; this sets the new password. */
export async function resetPasswordAction(
  _token: string,
  password: string,
  confirm: string,
): Promise<string | null> {
  const problem = passwordProblem(password);
  if (problem) return problem;
  if (password !== confirm) return "Those passwords don't match.";
  const session = await getSession();
  if (session.kind !== "user") return "This reset link has expired. Request a new one.";
  return changePassword(password);
}

async function changePassword(password: string): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) return null;
  if (error.code === "same_password") return "Choose a password you haven't used here before.";
  if (error.code === "weak_password") return error.message;
  console.error("[auth] password change failed", error.code, error.message);
  return "We couldn't change your password. Try again.";
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

export type ShelfResult = { ok: true; on: boolean; memberships?: import("@/lib/collection").Membership[] } | { ok: false };

/** Readers only: guests have no shelves, and administrators don't read. */
async function readerId(): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user" || session.role === "admin") return null;
  return session.id;
}

/** Sets the favorite to exactly `on`. `at` restores its old position on Undo. */
export async function setFavoriteAction(bookId: string, on: boolean, at?: number): Promise<ShelfResult> {
  const userId = await readerId();
  if (!userId) return { ok: false };
  try {
    if (!(await setFavorite(userId, bookId, on, at))) return { ok: false };
  } catch (error) {
    console.error(error);
    return { ok: false };
  }
  // Every reader page can show this book's heart or shelf state.
  revalidatePath("/", "layout");
  return { ok: true, on };
}

export async function listMyCollectionsAction(): Promise<import("@/lib/collection").CollectionGroup[]> {
  const userId = await readerId();
  if (!userId) return [];
  const { listCollections } = await import("@/lib/collections");
  return listCollections(userId);
}

export async function createGroupAction(name: string): Promise<{ ok: true; id: string; name: string } | { ok: false; message: string }> {
  const userId = await readerId();
  if (!userId) return { ok: false, message: "Log in to keep a Library." };
  const { createCollection } = await import("@/lib/collections");
  const created = await createCollection(userId, name);
  if ("error" in created) return { ok: false, message: created.error };
  revalidatePath("/library");
  return { ok: true, id: created.id, name: name.trim() };
}

export async function renameGroupAction(id: string, name: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const userId = await readerId();
  if (!userId) return { ok: false, message: "Log in to keep a Library." };
  const { renameCollection } = await import("@/lib/collections");
  const result = await renameCollection(userId, id, name);
  if ("error" in result) return { ok: false, message: result.error };
  revalidatePath("/library");
  return { ok: true };
}

export async function deleteGroupAction(id: string): Promise<boolean> {
  const userId = await readerId();
  if (!userId) return false;
  const { deleteCollection } = await import("@/lib/collections");
  const ok = await deleteCollection(userId, id);
  if (ok) revalidatePath("/library");
  return ok;
}

/** Drops the books from the collection on screen. They stay in Library. */
export async function removeFromCollectionAction(collectionId: string, bookIds: string[]): Promise<boolean> {
  const userId = await readerId();
  if (!userId) return false;
  const { removeBooksFromCollection } = await import("@/lib/collections");
  const ok = await removeBooksFromCollection(userId, collectionId, bookIds);
  if (ok) revalidatePath("/library");
  return ok;
}

export async function addToCollectionAction(collectionId: string, bookIds: string[]): Promise<boolean> {
  const userId = await readerId();
  if (!userId) return false;
  const { addBookToCollection } = await import("@/lib/collections");
  for (const bookId of bookIds) {
    if (!(await addBookToCollection(userId, collectionId, bookId))) return false;
  }
  revalidatePath("/library");
  return true;
}

/** Checkbox picker. `replace` is for one book. Several books are only added. */
export async function saveCollectionPickerAction(
  bookIds: string[],
  collectionIds: string[],
  newName: string,
  replace: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const userId = await readerId();
  if (!userId) return { ok: false, message: "Log in to keep a Library." };
  try {
    const { saveCollectionChoices } = await import("@/lib/collections");
    const result = await saveCollectionChoices(userId, bookIds, collectionIds, newName, replace);
    if ("error" in result) return { ok: false, message: result.error };
  } catch (error) {
    console.error(error);
    return { ok: false, message: "We couldn't update your Library. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Removes every book in one call and returns the collection rows Undo needs. */
export async function removeLibraryBooksAction(
  bookIds: string[],
): Promise<{ ok: true; memberships: import("@/lib/collection").Membership[] } | { ok: false }> {
  const userId = await readerId();
  if (!userId || bookIds.length === 0) return { ok: false };
  try {
    const { membershipsFor } = await import("@/lib/collections");
    const memberships = await membershipsFor(userId, bookIds);
    for (const bookId of bookIds) {
      if (!(await setInLibrary(userId, bookId, false))) return { ok: false };
    }
    revalidatePath("/", "layout");
    return { ok: true, memberships };
  } catch (error) {
    console.error(error);
    return { ok: false };
  }
}

export async function restoreLibraryBooksAction(
  bookIds: string[],
  memberships: import("@/lib/collection").Membership[],
  addedAt: Record<string, string>,
): Promise<boolean> {
  const userId = await readerId();
  if (!userId) return false;
  try {
    const { restoreMemberships } = await import("@/lib/collections");
    for (const bookId of bookIds) {
      if (!(await setInLibrary(userId, bookId, true, addedAt[bookId]))) return false;
    }
    if (!(await restoreMemberships(userId, memberships))) return false;
  } catch (error) {
    console.error(error);
    return false;
  }
  revalidatePath("/", "layout");
  return true;
}

export async function setProgressAction(bookId: string, progress: number): Promise<boolean> {
  const userId = await readerId();
  if (!userId) return false;
  const { setProgressMark } = await import("@/lib/progress");
  const ok = await setProgressMark(userId, bookId, progress);
  if (ok) revalidatePath("/library");
  return ok;
}

/** Adds the book to, or removes it from, Library. Never uses a download. Removal returns collection rows for Undo. */
export async function setLibraryAction(
  bookId: string,
  on: boolean,
  addedAt?: string,
  memberships?: import("@/lib/collection").Membership[],
): Promise<ShelfResult> {
  const userId = await readerId();
  if (!userId) return { ok: false };
  try {
    const { membershipsFor, restoreMemberships } = await import("@/lib/collections");
    const found = on ? [] : await membershipsFor(userId, [bookId]);
    if (!(await setInLibrary(userId, bookId, on, addedAt))) return { ok: false };
    if (on && memberships && memberships.length > 0) {
      if (!(await restoreMemberships(userId, memberships))) return { ok: false };
    }
    revalidatePath("/", "layout");
    return { ok: true, on, memberships: found };
  } catch (error) {
    console.error(error);
    return { ok: false };
  }
}

export async function updateNameAction(name: string): Promise<string | null> {
  const session = await getSession();
  if (session.kind !== "user") return "Log in to change your name.";
  const trimmed = name.trim();
  if (!trimmed) return "Enter a display name.";
  const supabase = await createClient();
  // Column grants allow display_name only; role can't be written from here.
  const { error: dbError } = await supabase.from("profiles").update({ display_name: trimmed }).eq("id", session.id);
  const error = dbError ? "We couldn't save your name. Try again." : null;
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
  return changePassword(password);
}

export type VerificationResult = { ok: boolean; message: string };

/** Emails a verification link to the signed-in account. Limits live in sendVerification. */
export async function sendVerificationAction(): Promise<VerificationResult> {
  const session = await getSession();
  if (session.kind !== "user") return { ok: false, message: "Log in to verify your email." };
  if (session.verified) return { ok: true, message: "Your email is already verified." };
  const result = await sendVerification(session.id, session.email);
  return { ok: result.status === "sent" || result.status === "already_verified", message: sendMessage(result) };
}
