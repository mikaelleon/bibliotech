/** Pure helpers for chat sessions. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Title for a new chat: the first question, tidied and clipped. No AI call. */
export function chatTitle(message: string): string {
  const clean = message.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 60 ? `${clean.slice(0, 59).trimEnd()}…` : clean;
}

export type ChatSummary = { id: string; title: string; updatedAt: string };
export type StoredMessage = { id: string; role: "user" | "model"; text: string };
