import { createHash } from "node:crypto";

import { apiError } from "@/lib/api-response";
import { EMPTY_SHELF, parseActions, type ShelfState } from "@/lib/assistant/actions";
import { getCatalogForAssistant } from "@/lib/assistant/catalog";
import { chatTitle, isUuid } from "@/lib/assistant/chat";
import { appendChatTurn, chatIsFull, loadChatHistory } from "@/lib/assistant/chats";
import { assistantConfig } from "@/lib/assistant/config";
import { clampHistory, filterMessage, REJECTION_MESSAGES } from "@/lib/assistant/filter";
import { openGeminiStream, type GeminiOpen } from "@/lib/assistant/gemini";
import { buildContents, catalogBlock, RefusalStripper, shelfBlock, SYSTEM_PROMPT, TailStripper } from "@/lib/assistant/prompt";
import { selectRelevant } from "@/lib/assistant/retrieve";
import { loadShelf } from "@/lib/assistant/shelf";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestUser } from "@/lib/supabase/request";

const MAX_BODY_BYTES = 20_000;

type Reservation = {
  status: string;
  requestId?: string;
  resetsDailyAt?: string;
  resetsMonthlyAt?: string;
  retryAfterSeconds?: number;
  [key: string]: unknown;
};

function clientIpHash(request: Request): string | null | undefined {
  const salt = process.env.AI_IP_SALT;
  if (!salt) return process.env.NODE_ENV === "production" ? undefined : null;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** POST /api/assistant — one Gemini call per question, streamed back as server-sent events. */
export async function POST(request: Request) {
  const user = await requestUser(request);
  if (!user) return apiError(401, "unauthenticated", "Log in to use the assistant.");

  const config = assistantConfig();
  if (!process.env.GEMINI_API_KEY || !config.model) {
    return apiError(503, "assistant_unavailable", "The assistant is not available right now.");
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return apiError(400, "rejected", REJECTION_MESSAGES.too_long);
  let body: { message?: unknown; history?: unknown; chatId?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "rejected", "That request could not be read.");
  }

  // Free local checks first: a rejected message spends no quota and no Gemini call.
  const filtered = filterMessage(body.message, config.maxMessageChars);
  if (!filtered.ok) return apiError(400, "rejected", REJECTION_MESSAGES[filtered.reason]);
  let history = clampHistory(body.history, config.maxHistoryTurns, config.maxMessageChars * 4);
  const chatId = isUuid(body.chatId) ? body.chatId.toLowerCase() : null;

  const ipHash = clientIpHash(request);
  if (ipHash === undefined) return apiError(503, "assistant_unavailable", "The assistant is not available right now.");

  // The secret-key client lives only inside this handler, after the caller is verified.
  const admin = createAdminClient();
  const reserved = await admin.rpc("reserve_ai_request", {
    p_user: user.id,
    p_ip_hash: ipHash,
    p_global_daily: config.globalDaily,
    p_global_rpm: config.globalRpm,
    p_ip_daily: config.ipDaily,
    p_burst_seconds: config.burstSeconds,
  });
  const reservation = reserved.data as Reservation | null;
  if (reserved.error || !reservation) {
    return apiError(500, "assistant_unavailable", "The assistant is not available right now.");
  }

  switch (reservation.status) {
    case "ok":
      break;
    case "too_fast":
      return apiError(429, "too_fast", "Slow down a little.", { retryAfter: config.burstSeconds });
    case "busy":
      return apiError(429, "busy", "Wait for the current answer to finish.");
    case "daily_limit":
      return apiError(429, "daily_limit", "You've used today's questions.", { resetsAt: reservation.resetsDailyAt });
    case "monthly_limit":
      return apiError(429, "monthly_limit", "You've used this month's questions.", { resetsAt: reservation.resetsMonthlyAt });
    case "busy_try_again":
      return apiError(429, "busy_try_again", "The assistant is busy. Try again shortly.", {
        retryAfter: reservation.retryAfterSeconds ?? 30,
      });
    case "ip_limit":
      return apiError(429, "ip_limit", "Too many questions from this network today. Try again tomorrow.");
    case "assistant_resting":
      return apiError(503, "assistant_resting", "The assistant is resting. Back tomorrow.");
    default:
      return apiError(401, "unauthenticated", "Log in to use the assistant.");
  }

  const requestId = reservation.requestId as string;
  const startedAt = Date.now();
  const finish = (status: "ok" | "refused" | "partial" | "failed", model: string, prompt?: number, output?: number) =>
    admin
      .rpc("finish_ai_request", {
        p_id: requestId,
        p_status: status,
        p_model: model,
        p_prompt: prompt ?? null,
        p_output: output ?? null,
        p_ms: Date.now() - startedAt,
      })
      .then(({ error }) => {
        if (error) console.error("assistant: finish_ai_request failed", error.code);
      });

  // Registered accounts keep their chats. For those, the stored chat is the history (the client's
  // copy is not trusted), and a full chat is refused before any quota is spent on Gemini.
  const persist = chatId !== null && reservation.tier === "registered";
  if (persist && chatId) {
    const stored = await loadChatHistory(user.supabase, chatId, config.maxHistoryTurns);
    if (stored) {
      if (chatIsFull(stored.count)) {
        await finish("failed", config.model);
        return apiError(409, "chat_full", "This chat is full. Start a new chat.");
      }
      history = clampHistory(stored.turns, config.maxHistoryTurns, 4000);
    }
  }

  // Build the prompt. Past AI_CATALOG_FULL_MAX books, send only the best keyword matches.
  let contents;
  let titles: ReadonlyMap<string, { title: string }> = new Map();
  let shelf: ShelfState = EMPTY_SHELF;
  try {
    // The reader's own shelf is read with their own client, so row level security scopes it.
    const [all, loadedShelf] = await Promise.all([getCatalogForAssistant(), loadShelf(user.supabase, user.id)]);
    shelf = loadedShelf;
    titles = new Map(all.map((b) => [b.slug, { title: b.title }]));
    const tooLarge = all.length > config.catalogFullMax;
    const query = [...history.filter((t) => t.role === "user").map((t) => t.text), filtered.message].join(" ");
    const lines = tooLarge ? selectRelevant(all, query, Math.min(10, config.catalogFullMax)) : all;
    // A shelf change must name a book the model can see, so shelf books always make the cut.
    const shown = new Set(lines.map((b) => b.slug));
    const extra = all.filter((b) => !shown.has(b.slug) && (shelf.library.includes(b.slug) || shelf.favorites.includes(b.slug)));
    const context = `${catalogBlock(tooLarge ? [...lines, ...extra] : lines, tooLarge)}

${shelfBlock(shelf, titles)}`;
    contents = buildContents(context, history, filtered.message);
  } catch {
    await finish("failed", config.model);
    return apiError(502, "upstream_error", "The assistant couldn't load the library. Try again.");
  }

  // Primary model, then the fallback once, only before any text has streamed.
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const open = (model: string) =>
    openGeminiStream({ model, system: SYSTEM_PROMPT, contents, maxOutputTokens: config.maxOutputTokens, signal: abort.signal });

  let opened: GeminiOpen = await open(config.model);
  if (!opened.ok) {
    const canFallback = opened.retryable && config.fallbackModel && config.fallbackModel !== config.model;
    console.warn("assistant: primary model failed", opened.model, opened.status);
    if (canFallback) {
      // Google counts the failed call, so the global counters must too. Not charged to the user.
      await admin.rpc("log_ai_extra_call", {
        p_user: user.id,
        p_ip_hash: ipHash,
        p_model: opened.model,
        p_status: "failed",
      });
      opened = await open(config.fallbackModel);
      if (!opened.ok) console.warn("assistant: fallback model failed", opened.model, opened.status);
    }
  }
  if (!opened.ok) {
    await finish("failed", opened.model);
    return apiError(502, "upstream_error", "The assistant couldn't answer right now. Try again.");
  }

  const { stream, model } = opened;
  const stripper = new RefusalStripper();
  const suggest = new TailStripper();

  let clientGone = false;
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let promptTokens: number | undefined;
      let outputTokens: number | undefined;
      let delivered = false;
      let reply = "";
      let failed = false;
      const send = (event: string, data: unknown) => {
        if (clientGone) return;
        try {
          controller.enqueue(sse(event, data));
        } catch {
          clientGone = true;
          abort.abort();
        }
      };

      const quota = async () => {
        const { data } = await admin.rpc("ai_quota_status", { p_user: user.id });
        return data ?? null;
      };

      send("meta", { quota: await quota() });
      try {
        for await (const chunk of stream) {
          promptTokens = chunk.promptTokens ?? promptTokens;
          outputTokens = chunk.outputTokens ?? outputTokens;
          const text = suggest.push(stripper.push(chunk.text));
          if (text) {
            delivered = true;
            reply += text;
            send("delta", { text });
          }
          if (clientGone) break;
        }
        const tail = suggest.push(stripper.flush()) + suggest.flush();
        if (tail) {
          delivered = true;
          reply += tail;
          send("delta", { text: tail });
        }
      } catch {
        failed = true;
      }

      // Client left or the stream broke after text started: counted as partial, never as failed.
      const status = clientGone || failed ? (delivered ? "partial" : "failed") : stripper.refused ? "refused" : "ok";
      await finish(status, model, promptTokens, outputTokens);

      // Save the exchange for registered accounts. Nothing is saved for a failed answer, and a
      // storage problem never blocks the reply.
      let saved: { id: string; title: string } | null = null;
      if (persist && chatId && status !== "failed" && reply.trim()) {
        const result = await appendChatTurn(admin, {
          userId: user.id,
          chatId,
          title: chatTitle(filtered.message),
          userText: filtered.message,
          modelText: reply.trim(),
        });
        if (result?.status === "ok") saved = { id: chatId, title: result.title ?? chatTitle(filtered.message) };
      }

      if (!clientGone) {
        if (saved) send("chat", saved);
        if (failed) send("error", { code: "stream_error", message: "The answer was cut off. Try again." });
        // Follow-up pills: each one must pass the same filter a typed question would.
        const suggestions = [...new Set(suggest.suggestions)]
          .filter((item) => filterMessage(item, 60).ok)
          .slice(0, 3);
        // Proposed shelf changes: checked against the real catalog and shelf, and labelled from them.
        const actions = stripper.refused || failed ? [] : parseActions(suggest.actions, titles, shelf);
        if (actions.length) send("actions", { actions });
        if (suggestions.length && !failed) send("suggestions", { suggestions });
        send("done", { quota: await quota(), refused: stripper.refused });
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      clientGone = true;
      abort.abort();
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
