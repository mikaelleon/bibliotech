import "server-only";

import type { GeminiContent } from "./prompt";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
// Flash-lite's first byte on a cold call lands around 10s. A 10s cap aborts that call
// and the fallback, which is what the reader sees as "couldn't answer right now".
const FIRST_TOKEN_MS = 20_000;
const TOTAL_MS = 45_000;

export type GeminiChunk = { text: string; promptTokens?: number; outputTokens?: number };

export type GeminiOpen =
  | { ok: true; model: string; stream: AsyncGenerator<GeminiChunk> }
  /** `retryable` is false when the prompt itself was blocked: a second model would not help. */
  | { ok: false; model: string; status: number; retryable: boolean };

type StreamPayload = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

type Parsed = GeminiChunk & { blocked?: boolean };

function parsePayload(raw: string): Parsed | null {
  let json: StreamPayload;
  try {
    json = JSON.parse(raw) as StreamPayload;
  } catch {
    return null;
  }
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const blocked = Boolean(json.promptFeedback?.blockReason) || candidate?.finishReason === "SAFETY";
  return {
    text,
    promptTokens: json.usageMetadata?.promptTokenCount,
    outputTokens: json.usageMetadata?.candidatesTokenCount,
    blocked,
  };
}

/** Reads `data: {...}` lines from a server-sent-events body. */
async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<Parsed> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const parsed = parsePayload(line.slice(5).trim());
        if (parsed) yield parsed;
      }
    }
    const rest = buffer.trim();
    if (rest.startsWith("data:")) {
      const parsed = parsePayload(rest.slice(5).trim());
      if (parsed) yield parsed;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export type OpenOptions = {
  model: string;
  system: string;
  contents: GeminiContent[];
  maxOutputTokens: number;
  /** Aborts the request, for example when the client disconnects. */
  signal?: AbortSignal;
};

/**
 * Starts a streaming call and waits for the first token. Anything that goes wrong before it
 * (HTTP error, timeout, empty reply) comes back as `ok: false` so the caller can retry on the
 * fallback model. Once `ok: true`, the caller owns the stream and must not switch models.
 * The API key is sent in a header and never appears in a URL, a log line or an error.
 */
export async function openGeminiStream(opts: OpenOptions): Promise<GeminiOpen> {
  const key = process.env.GEMINI_API_KEY;
  const model = opts.model.replace(/^models\//, "");
  if (!key || !model) return { ok: false, model, status: 0, retryable: false };

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);
  if (opts.signal?.aborted) controller.abort();

  const total = setTimeout(() => controller.abort(), TOTAL_MS);
  const first = setTimeout(() => controller.abort(), FIRST_TOKEN_MS);
  const cleanup = () => {
    clearTimeout(first);
    clearTimeout(total);
    opts.signal?.removeEventListener("abort", onAbort);
  };

  try {
    const response = await fetch(`${BASE}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents,
        generationConfig: { maxOutputTokens: opts.maxOutputTokens, temperature: 0.5 },
        safetySettings: [
          "HARM_CATEGORY_HARASSMENT",
          "HARM_CATEGORY_HATE_SPEECH",
          "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "HARM_CATEGORY_DANGEROUS_CONTENT",
        ].map((category) => ({ category, threshold: "BLOCK_LOW_AND_ABOVE" })),
      }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      cleanup();
      controller.abort();
      return { ok: false, model, status: response.status, retryable: true };
    }

    const events = readEvents(response.body);
    let head: Parsed | null = null;
    let blocked = false;
    for (;;) {
      const next = await events.next();
      if (next.done) break;
      if (next.value.blocked) blocked = true;
      if (next.value.text) {
        head = next.value;
        break;
      }
    }
    clearTimeout(first);
    if (!head) {
      cleanup();
      controller.abort();
      return { ok: false, model, status: 200, retryable: !blocked };
    }

    const firstChunk = head;
    async function* rest(): AsyncGenerator<GeminiChunk> {
      try {
        yield firstChunk;
        for (;;) {
          const next = await events.next();
          if (next.done) return;
          yield next.value;
        }
      } finally {
        cleanup();
        controller.abort();
      }
    }
    return { ok: true, model, stream: rest() };
  } catch {
    cleanup();
    controller.abort();
    return { ok: false, model, status: 0, retryable: !opts.signal?.aborted };
  }
}
