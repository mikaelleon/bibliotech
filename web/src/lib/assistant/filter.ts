/**
 * Local pre-filter and history clamp. Free: runs before any Gemini call and before the quota
 * reservation. Keep the rules conservative: a false positive on a real book question is worse
 * than missing a weak abuse attempt, because the system prompt is the second line of defence.
 * The phrase list lives here so it can be tuned from logs.
 */

export type ChatTurn = { role: "user" | "model"; text: string };

const INJECTION_PHRASES = [
  "ignore previous",
  "ignore all previous",
  "ignore the above",
  "ignore all instructions",
  "ignore your instructions",
  "disregard previous",
  "disregard your instructions",
  "system prompt",
  "you are now",
  "jailbreak",
  "developer mode",
];

const CODE_CHARS = /[{};<>=]/g;

export type FilterResult = { ok: true; message: string } | { ok: false; reason: "empty" | "too_long" | "injection" | "code" };

export function filterMessage(raw: unknown, maxChars: number): FilterResult {
  const message = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!message) return { ok: false, reason: "empty" };
  if (message.length > maxChars) return { ok: false, reason: "too_long" };

  const lower = message.toLowerCase();
  if (INJECTION_PHRASES.some((phrase) => lower.includes(phrase))) return { ok: false, reason: "injection" };

  if (message.includes("```")) return { ok: false, reason: "code" };
  const codeChars = message.match(CODE_CHARS)?.length ?? 0;
  if (message.length >= 12 && codeChars / message.length > 0.15) return { ok: false, reason: "code" };

  const urls = message.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (urls > 2) return { ok: false, reason: "code" };

  return { ok: true, message };
}

export const REJECTION_MESSAGES: Record<Extract<FilterResult, { ok: false }>["reason"], string> = {
  empty: "Type a question about a book or author.",
  too_long: "That message is too long. Keep it short.",
  injection: "I can only help with books, authors and this library.",
  code: "I can only help with books, authors and this library.",
};

/**
 * Validate and clamp client history: known roles only, strings only, last N turns, each turn
 * clipped. The client's history is data for the model, never instructions.
 */
export function clampHistory(raw: unknown, maxTurns: number, maxChars: number): ChatTurn[] {
  if (!Array.isArray(raw) || maxTurns <= 0) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { role, text } = item as { role?: unknown; text?: unknown };
    if ((role !== "user" && role !== "model") || typeof text !== "string") continue;
    const clean = text.replace(/\s+/g, " ").trim().slice(0, Math.max(maxChars, 600));
    if (clean) turns.push({ role, text: clean });
  }
  let tail = turns.slice(-maxTurns);
  // Gemini expects the conversation to open with a user turn.
  while (tail.length && tail[0].role !== "user") tail = tail.slice(1);
  return tail;
}
