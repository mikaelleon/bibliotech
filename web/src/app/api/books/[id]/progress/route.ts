import { apiError, apiJson } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request";

async function bookId(slug: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("books").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

/** GET /api/books/:id/progress — saved reading position for this account. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Log in to see reading progress.");
  const id = await bookId((await context.params).id);
  if (!id) return apiError(404, "BOOK_NOT_FOUND", "That book isn't in the catalog.");

  const { data, error } = await user.supabase
    .from("reading_progress")
    .select("cfi, progress, updated_at")
    .eq("user_id", user.id)
    .eq("book_id", id)
    .maybeSingle();
  if (error) return apiError(500, "PROGRESS_UNAVAILABLE", "We couldn't load the reading position.");
  return apiJson({
    cfi: data?.cfi ?? null,
    progress: data?.progress ?? 0,
    updatedAt: data?.updated_at ?? null,
  });
}

/** PUT /api/books/:id/progress — last write wins when updatedAt is newer. */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Log in to save reading progress.");
  const id = await bookId((await context.params).id);
  if (!id) return apiError(404, "BOOK_NOT_FOUND", "That book isn't in the catalog.");

  let body: { cfi?: unknown; progress?: unknown; updatedAt?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError(400, "INVALID_BODY", "Send the reading position as JSON.");
  }
  const cfi = typeof body.cfi === "string" ? body.cfi.slice(0, 200) : "";
  const progress = typeof body.progress === "number" && Number.isFinite(body.progress) ? Math.min(1, Math.max(0, body.progress)) : 0;
  const now = Date.now();
  const sent = typeof body.updatedAt === "string" ? Date.parse(body.updatedAt) : now;
  const updatedAt = new Date(Number.isFinite(sent) ? Math.min(sent, now) : now).toISOString();
  if (!cfi) return apiError(400, "INVALID_BODY", "A reading position is required.");

  const { data: current } = await user.supabase
    .from("reading_progress")
    .select("updated_at")
    .eq("user_id", user.id)
    .eq("book_id", id)
    .maybeSingle();
  if (current?.updated_at && new Date(current.updated_at).getTime() > new Date(updatedAt).getTime()) {
    return apiJson({ saved: false, updatedAt: current.updated_at });
  }

  const { error } = await user.supabase.from("reading_progress").upsert(
    { user_id: user.id, book_id: id, cfi, progress, updated_at: updatedAt },
    { onConflict: "user_id,book_id" },
  );
  if (error) return apiError(500, "PROGRESS_UNAVAILABLE", "We couldn't save the reading position.");
  return apiJson({ saved: true, updatedAt });
}
