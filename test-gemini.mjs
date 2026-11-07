const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("GEMINI_API_KEY is not set"); process.exit(1); }

const base = "https://generativelanguage.googleapis.com/v1beta";
const headers = { "x-goog-api-key": key, "Content-Type": "application/json" };
const model = process.argv[2];

if (!model) {
  // No argument: list models that support generateContent
  const r = await fetch(`${base}/models`, { headers });
  const j = await r.json();
  if (!r.ok) { console.error(r.status, j.error?.message); process.exit(1); }
  j.models
    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
    .forEach(m => console.log(m.name.replace("models/", "")));
} else {
  // With a model name: send one test prompt
  const r = await fetch(`${base}/models/${model}:generateContent`, {
    method: "POST",
    headers,
    body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: ready" }] }] }),
  });
  const j = await r.json();
  if (!r.ok) { console.error(r.status, j.error?.message); process.exit(1); }
  console.log(j.candidates?.[0]?.content?.parts?.[0]?.text);
}