import { fetch as streamFetch } from "expo/fetch";

import { accessToken, apiBase } from "@/lib/api";

/** Client side of the AI assistant. Same contract as the web panel (docs/ai-assistant.md, 8, 16, 17). */

export const MAX_CHARS = 300;
export const HISTORY_TURNS = 6;

export type Quota = {
  tier: string;
  usedToday: number;
  limitToday: number;
  usedMonth: number;
  limitMonth: number;
  resetsDailyAt: string;
  resetsMonthlyAt: string;
};

export type ActionType =
  | "add_library"
  | "remove_library"
  | "favorite"
  | "unfavorite"
  | "add_to_collection"
  | "create_collection";

export type ActionProposal = {
  id: string;
  type: ActionType;
  slug?: string;
  title?: string;
  collectionId?: string;
  collectionName?: string;
  label: string;
};

export type ChatSummary = { id: string; title: string; updatedAt: string };
export type StoredMessage = { id: string; role: "user" | "model"; text: string };

export type ApiError = { code?: string; message?: string; resetsAt?: string; retryAfter?: number };

export type StreamEvent =
  | { event: "meta" | "done"; quota?: Quota | null }
  | { event: "chat"; id: string; title: string }
  | { event: "actions"; actions: ActionProposal[] }
  | { event: "suggestions"; suggestions: string[] }
  | { event: "delta"; text: string }
  | { event: "error"; error: ApiError };

/** A v4 uuid. The client names a new chat so a stopped first question still lands in it. */
export function newChatId(): string {
  const bytes = new Uint8Array(16);
  const crypto = globalThis.crypto;
  if (crypto?.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function resetText(iso: string | undefined, monthly = false): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return monthly
    ? ` It resets on ${date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`
    : ` It resets at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`;
}

/** One friendly sentence per error code from the API. */
export function errorText(error: ApiError, status: number): string {
  switch (error.code) {
    case "unauthenticated":
      return "Log in to ask the assistant.";
    case "rejected":
      return error.message || "I can only help with books, authors and this library.";
    case "too_fast":
      return "Slow down a little, then try again.";
    case "busy":
      return "Wait for the current answer to finish.";
    case "daily_limit":
      return `You've used today's questions.${resetText(error.resetsAt)}`;
    case "monthly_limit":
      return `You've used this month's questions.${resetText(error.resetsAt, true)}`;
    case "busy_try_again":
      return `The assistant is busy. Try again in ${error.retryAfter ?? 30} seconds.`;
    case "ip_limit":
      return "Too many questions from this network today. Try again tomorrow.";
    case "assistant_resting":
      return "The assistant is resting. Back tomorrow.";
    case "assistant_unavailable":
      return "The assistant isn't available right now.";
    case "upstream_error":
      return "The assistant couldn't answer right now. Try again.";
    case "stream_error":
      return "The answer was cut off. Try again.";
    case "chat_full":
      return "This chat is full. Start a new chat.";
    case "offline":
      return "Couldn't reach the server. Check your connection.";
    case "no_api_url":
      return "The app isn't connected to the server yet.";
    default:
      return status >= 500 ? "The assistant isn't available right now." : error.message || "Something went wrong.";
  }
}

function toEvent(event: string, data: unknown): StreamEvent | null {
  const p = (data ?? {}) as Record<string, unknown> & ApiError;
  if (event === "meta" || event === "done") return { event, quota: (p.quota as Quota | null | undefined) ?? null };
  if (event === "chat" && typeof p.id === "string" && typeof p.title === "string") return { event, id: p.id, title: p.title };
  if (event === "actions" && Array.isArray(p.actions)) return { event, actions: p.actions as ActionProposal[] };
  if (event === "suggestions" && Array.isArray(p.suggestions)) {
    return { event, suggestions: p.suggestions.filter((s): s is string => typeof s === "string").slice(0, 3) };
  }
  if (event === "delta" && typeof p.text === "string" && p.text) return { event, text: p.text };
  if (event === "error") return { event, error: p as ApiError };
  return null;
}

/** Reads a server-sent-events body and calls back once per complete event. */
async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (event: StreamEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let end: number;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = toEvent(event, JSON.parse(data));
        if (parsed) onEvent(parsed);
      } catch {
        // A malformed event is skipped; the stream carries on.
      }
    }
  }
}

export type SendResult = { ok: true } | { ok: false; status: number; error: ApiError };

/**
 * POST /api/assistant and stream the answer. The Gemini key never leaves the server: the app only
 * sends the Supabase access token. `expo/fetch` is used because React Native's own fetch buffers
 * the whole body, which would show nothing until the answer is complete.
 */
export async function streamAnswer(
  input: { message: string; history: { role: "user" | "model"; text: string }[]; chatId: string | null },
  onEvent: (event: StreamEvent) => void,
  signal: AbortSignal,
): Promise<SendResult> {
  const base = apiBase();
  if (!base) return { ok: false, status: 0, error: { code: "no_api_url" } };
  const token = await accessToken();
  if (!token) return { ok: false, status: 401, error: { code: "unauthenticated" } };

  try {
    const response = await streamFetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        message: input.message,
        history: input.history,
        ...(input.chatId ? { chatId: input.chatId } : {}),
      }),
      signal,
    });
    if (!response.ok || !response.body) {
      const json = (await response.json().catch(() => null)) as { error?: ApiError } | null;
      return { ok: false, status: response.status, error: json?.error ?? {} };
    }
    await readEvents(response.body, onEvent);
    return { ok: true };
  } catch (error) {
    if (signal.aborted || (error as { name?: string }).name === "AbortError") throw error;
    return { ok: false, status: 0, error: { code: "offline" } };
  }
}

async function call<T>(path: string, init?: { method?: string }): Promise<T | null> {
  const base = apiBase();
  const token = await accessToken();
  if (!base || !token) return null;
  try {
    const response = await fetch(`${base}${path}`, {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return (await response.json().catch(() => ({}))) as T;
  } catch {
    return null;
  }
}

export async function loadQuota(): Promise<Quota | null> {
  return (await call<{ quota?: Quota }>("/api/assistant/quota"))?.quota ?? null;
}

export async function loadChats(): Promise<ChatSummary[] | null> {
  const json = await call<{ chats?: ChatSummary[] }>("/api/assistant/chats");
  return json ? (json.chats ?? []) : null;
}

export async function loadChat(id: string): Promise<StoredMessage[] | null> {
  const json = await call<{ messages?: StoredMessage[] }>(`/api/assistant/chats/${id}`);
  return json ? (json.messages ?? []) : null;
}

export async function deleteChat(id: string | "all"): Promise<boolean> {
  const json = await call<{ ok?: boolean }>(id === "all" ? "/api/assistant/chats" : `/api/assistant/chats/${id}`, {
    method: "DELETE",
  });
  return Boolean(json);
}
