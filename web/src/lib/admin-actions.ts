"use server";

import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/admin";
import { invalidateCatalog } from "@/lib/catalog";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export type AdminResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const messages: Record<string, string> = {
  "not allowed": "You don't have permission to do that.",
  invalid: "Check the fields and try again.",
  "not found": "That item no longer exists.",
  self: "You cannot change your own role.",
  "last admin": "The last administrator cannot be demoted.",
  "has downloads": "This book has download records, so it cannot be deleted.",
};

/** The database raises short codes. Anything else is shown as a generic failure. */
function fail(error: { message: string }): { ok: false; error: string } {
  const known = Object.keys(messages).find((code) => error.message.includes(code));
  return { ok: false, error: known ? messages[known] : "Something went wrong. Try again." };
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
