/** Assistant settings. Env values override the defaults. Server only: never prefix with NEXT_PUBLIC_. */

function intEnv(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;
}

export function assistantConfig() {
  return {
    model: process.env.GEMINI_MODEL?.trim() ?? "",
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL?.trim() ?? "",
    globalDaily: intEnv("AI_GLOBAL_DAILY_LIMIT", 1200),
    globalRpm: intEnv("AI_GLOBAL_RPM_LIMIT", 24),
    maxMessageChars: intEnv("AI_MAX_MESSAGE_CHARS", 300, 1),
    maxHistoryTurns: intEnv("AI_MAX_HISTORY_TURNS", 6),
    maxOutputTokens: intEnv("AI_MAX_OUTPUT_TOKENS", 400, 16),
    burstSeconds: intEnv("AI_BURST_SECONDS", 3),
    ipDaily: intEnv("AI_IP_DAILY_LIMIT", 60),
    catalogFullMax: intEnv("AI_CATALOG_FULL_MAX", 150, 1),
  };
}

export type AssistantConfig = ReturnType<typeof assistantConfig>;
