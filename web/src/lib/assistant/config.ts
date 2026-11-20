/** Assistant settings. Env values override the defaults. Server only: never prefix with NEXT_PUBLIC_. */

/**
 * Gemini model ids look like `gemini-3.8-flash`. A value that starts with a digit
 * (`3.5-flash-lite`) is the same model with the prefix left off, and the API 404s it.
 */
export function normalizeModelId(raw: string | undefined): string {
  const id = raw?.trim().replace(/^models\//, "") ?? "";
  if (!id) return "";
  if (/^\d/.test(id)) return `gemini-${id}`;
  return id;
}

function intEnv(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;
}

export function assistantConfig() {
  return {
    model: normalizeModelId(process.env.GEMINI_MODEL),
    fallbackModel: normalizeModelId(process.env.GEMINI_FALLBACK_MODEL),
    globalDaily: intEnv("AI_GLOBAL_DAILY_LIMIT", 1200),
    globalRpm: intEnv("AI_GLOBAL_RPM_LIMIT", 24),
    maxMessageChars: intEnv("AI_MAX_MESSAGE_CHARS", 300, 1),
    maxHistoryTurns: intEnv("AI_MAX_HISTORY_TURNS", 6),
    maxOutputTokens: intEnv("AI_MAX_OUTPUT_TOKENS", 600, 16),
    burstSeconds: intEnv("AI_BURST_SECONDS", 3),
    ipDaily: intEnv("AI_IP_DAILY_LIMIT", 60),
    catalogFullMax: intEnv("AI_CATALOG_FULL_MAX", 150, 1),
  };
}

export type AssistantConfig = ReturnType<typeof assistantConfig>;
