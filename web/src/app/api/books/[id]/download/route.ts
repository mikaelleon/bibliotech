import { apiError, apiJson } from "@/lib/api-response";
import { clientIp, hit, limits, waitMessage, blockedFor } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request";

type DownloadResult = {
  status: string;
  used?: number;
  limit?: number;
  tier?: string;
  resetsAt?: string;
  lastDownloadedAt?: string;
};

type BookRow = { id: string; slug: string; file_path: string | null };

/** POST /api/books/:id/download — :id is the book slug. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "UNAUTHENTICATED", "Log in to download a book.");

  const ip = await clientIp();
  const ipWait = blockedFor(`download:ip:${ip}`, limits.downloadIp);
  const userWait = blockedFor(`download:user:${user.id}`, limits.downloadUser);
  if (ipWait || userWait) return apiError(429, "RATE_LIMITED", waitMessage(Math.max(ipWait, userWait)));
  hit(`download:ip:${ip}`, limits.downloadIp);
  hit(`download:user:${user.id}`, limits.downloadUser);

  const { id } = await context.params;
  let body: { deviceLabel?: unknown; confirmRepeat?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel.slice(0, 80) : "";
  const confirmRepeat = body.confirmRepeat === true;

  const admin = createAdminClient();
  const { data: book, error: bookError } = await admin
    .from("books")
    .select("id, slug, file_path")
    .eq("slug", id)
    .maybeSingle();
  if (bookError) return apiError(500, "CATALOG_UNAVAILABLE", "We couldn't look up that book.");
  const row = book as BookRow | null;
  if (!row) return apiError(404, "BOOK_NOT_FOUND", "That book isn't in the catalog.");
  if (!row.file_path) return apiError(404, "BOOK_NOT_AVAILABLE", "This book has no file yet.");

  const { data, error } = await admin.rpc("request_download", {
    p_user: user.id,
    p_book: row.id,
    p_device: deviceLabel,
    p_confirm_repeat: confirmRepeat,
  });
  if (error || !data) return apiError(500, "DOWNLOAD_FAILED", "We couldn't record the download.");
  const result = data as DownloadResult;

  if (result.status === "forbidden") return apiError(403, "FORBIDDEN_ROLE", "Administrator accounts don't download books.");
  if (result.status === "not_found") return apiError(404, "ACCOUNT_NOT_FOUND", "We couldn't find that account.");
  if (result.status === "not_available") return apiError(404, "BOOK_NOT_AVAILABLE", "This book has no file yet.");
  if (result.status === "already_downloaded") {
    return apiError(409, "ALREADY_DOWNLOADED", "You already downloaded this book.", {
      lastDownloadedAt: result.lastDownloadedAt ?? null,
    });
  }
  if (result.status === "quota_exceeded") {
    return apiError(403, "QUOTA_EXCEEDED", "You've used every download for this month.", {
      used: result.used ?? null,
      limit: result.limit ?? null,
      tier: result.tier ?? null,
      resetsAt: result.resetsAt ?? null,
    });
  }
  if (result.status !== "ok" && result.status !== "repeat_ok") {
    return apiError(500, "DOWNLOAD_FAILED", "We couldn't record the download.");
  }

  const signed = await admin.storage.from("books").createSignedUrl(row.file_path, 60);
  if (signed.error || !signed.data?.signedUrl) {
    return apiError(
      500,
      "FILE_UNAVAILABLE",
      "The download was counted. Saving the file failed. Try again. It won't use another download.",
    );
  }

  return apiJson({
    url: signed.data.signedUrl,
    expiresIn: 60,
    used: result.used ?? null,
    limit: result.limit ?? null,
    repeat: result.status === "repeat_ok",
  });
}
