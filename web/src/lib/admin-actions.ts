"use server";

import { revalidatePath } from "next/cache";

import { appOrigin } from "@/lib/app-origin";
import { assertAdmin, maskEmail } from "@/lib/admin";
import { emailPattern, passwordProblem } from "@/lib/auth-rules";
import { invalidateCatalog } from "@/lib/catalog";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export type AdminResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const messages: Record<string, string> = {
  "not allowed": "You don't have permission to do that.",
  invalid: "Check the fields and try again.",
  "not found": "That item no longer exists.",
  self: "You cannot do that to your own account.",
  generic: "Something went wrong. Try again.",
  "last admin": "The last administrator cannot be demoted.",
  "has downloads": "This book has download records, so it cannot be deleted.",
};

/** The database raises short codes. Anything else is shown as a generic failure. */
function fail(error: { message: string }): { ok: false; error: string } {
  const known = Object.keys(messages).find((code) => error.message.includes(code));
  return { ok: false, error: known ? messages[known] : messages.generic };
}

async function adminClient() {
  const session = await getSession();
  assertAdmin(session);
  return createClient();
}

export async function setUserRole(userId: string, role: string): Promise<AdminResult> {
  if (role !== "user" && role !== "admin") return { ok: false, error: messages.invalid };
  const supabase = await adminClient();
  const { error } = await supabase.rpc("admin_set_user_role", { p_user: userId, p_role: role });
  if (error) return fail(error);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export type BookInput = {
  slug?: string;
  title: string;
  author: string;
  category: string;
  language: string;
  license: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  coverUrl: string;
};

export async function saveBook(input: BookInput): Promise<AdminResult<{ slug: string }>> {
  if (!(CATEGORIES as readonly string[]).includes(input.category)) return { ok: false, error: messages.invalid };
  const supabase = await adminClient();
  const { data, error } = await supabase.rpc("admin_save_book", {
    p_slug: input.slug ?? null,
    p_title: input.title,
    p_author: input.author,
    p_category: input.category,
    p_language: input.language,
    p_license: input.license,
    p_source_name: input.sourceName,
    p_source_url: input.sourceUrl,
    p_summary: input.summary,
    p_cover_url: input.coverUrl,
  });
  if (error) return fail(error);
  invalidateCatalog();
  revalidatePath("/admin/books");
  revalidatePath("/browse");
  return { ok: true, data: { slug: String(data) } };
}

export async function deleteBook(slug: string): Promise<AdminResult> {
  const supabase = await adminClient();
  const { error } = await supabase.rpc("admin_delete_book", { p_slug: slug });
  if (error) return fail(error);
  invalidateCatalog();
  revalidatePath("/admin/books");
  revalidatePath("/browse");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Accounts. The database guard runs first (admin only, target exists, not yourself),
// then the auth admin API does the work, then the audit row is written.

async function guarded(userId: string, allowSelf = false) {
  const supabase = await adminClient();
  const { error } = await supabase.rpc("admin_guard_target", { p_user: userId, p_allow_self: allowSelf });
  return { supabase, error };
}

/** Disabled accounts cannot sign in or refresh a session. An open session ends when its token expires. */
export async function setUserDisabled(userId: string, disabled: boolean): Promise<AdminResult> {
  const { supabase, error } = await guarded(userId);
  if (error) return fail(error);
  const { error: authError } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: disabled ? "876000h" : "none",
  });
  if (authError) {
    console.error("[admin] disable failed", authError.message);
    return { ok: false, error: messages.generic };
  }
  await supabase.rpc("admin_log", { p_action: disabled ? "disable_user" : "enable_user", p_target: userId, p_detail: {} });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function sendUserPasswordReset(userId: string): Promise<AdminResult> {
  const { supabase, error } = await guarded(userId, true);
  if (error) return fail(error);
  const admin = createAdminClient();
  const { data, error: lookup } = await admin.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (lookup || !email) return { ok: false, error: messages["not found"] };
  const redirectTo = `${await appOrigin()}/auth/callback?next=/reset-password`;
  const { error: sendError } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
  if (sendError) {
    console.error("[admin] reset email failed", sendError.message);
    return { ok: false, error: sendError.status === 429 ? "Too many emails. Try again later." : messages.generic };
  }
  await supabase.rpc("admin_log", { p_action: "reset_password", p_target: userId, p_detail: {} });
  return { ok: true };
}

/** Removes the account, favorites and library. Download records stay with no person attached. */
export async function deleteUser(userId: string): Promise<AdminResult> {
  const { supabase, error } = await guarded(userId);
  if (error) return fail(error);
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const label = data.user?.email ? maskEmail(data.user.email) : "";
  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("[admin] delete failed", authError.message);
    return { ok: false, error: messages.generic };
  }
  await supabase.rpc("admin_log", { p_action: "delete_user", p_target: null, p_detail: { account: label } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export type NewUserInput = {
  email: string;
  name: string;
  role: string;
  method: string;
  password: string;
};

export async function createUser(input: NewUserInput): Promise<AdminResult<{ id: string }>> {
  const supabase = await adminClient();
  const email = input.email.trim();
  const name = input.name.trim();
  if (!emailPattern.test(email)) return { ok: false, error: "Enter a valid email, like name@example.com." };
  if (input.role !== "user" && input.role !== "admin") return { ok: false, error: messages.invalid };
  const metadata = name ? { display_name: name } : undefined;
  const admin = createAdminClient();

  let id: string | undefined;
  if (input.method === "password") {
    const problem = passwordProblem(input.password);
    if (problem) return { ok: false, error: problem };
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) return { ok: false, error: createError(error) };
    id = data.user?.id;
  } else {
    const redirectTo = `${await appOrigin()}/auth/callback?next=/reset-password`;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: metadata, redirectTo });
    if (error) return { ok: false, error: createError(error) };
    id = data.user?.id;
  }
  if (!id) return { ok: false, error: messages.generic };

  if (input.role === "admin") {
    const { error } = await supabase.rpc("admin_set_user_role", { p_user: id, p_role: "admin" });
    if (error) return { ok: false, error: `The account was created, but the role was not set. ${fail(error).error}` };
  }
  await supabase.rpc("admin_log", {
    p_action: "create_user",
    p_target: id,
    p_detail: { role: input.role, method: input.method },
  });
  revalidatePath("/admin/users");
  return { ok: true, data: { id } };
}

function createError(error: { message: string; status?: number }): string {
  if (/already|registered|exists/i.test(error.message)) return "An account with that email already exists.";
  if (error.status === 429) return "Too many emails. Try again later.";
  console.error("[admin] create user failed", error.message);
  return messages.generic;
}
