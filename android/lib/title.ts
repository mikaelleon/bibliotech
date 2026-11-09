/**
 * Gutenberg catalog titles sometimes keep MARC subfields (`$a`, `$b`, `$c`).
 * Keep the title and subtitle. Drop the statement of responsibility.
 * The same rules live in scripts/import-books/lib.mjs.
 */
export function cleanTitle(title: string): string {
  let value = title.replace(/\s+/g, " ").trim();
  value = value.replace(/\s+\/\s+\$c\b.*$/i, "");
  value = value.replace(/\$c\b.*/i, "");
  value = value.replace(/(?:^|\s)\$a\s+/gi, " ");
  value = value.replace(/\s*:\s*\$b\s+/gi, ": ");
  value = value.replace(/\$[a-z]\b\s*/gi, "");
  value = value.replace(/\s*;\s*:/g, ":");
  value = value.replace(/\s+:\s+/g, ": ");
  value = value.replace(/\s+\/\s*$/g, "");
  value = value.replace(/\s{2,}/g, " ").trim();
  value = value.replace(/^[:;,\s]+|[:;\s]+$/g, "");
  return value || title.trim();
}

/** Main title when a catalog subtitle makes the whole string too long to sit on a card. */
export function displayTitle(title: string, limit = 72): string {
  const clean = cleanTitle(title);
  if (clean.length <= limit) return clean;
  const colon = clean.indexOf(": ");
  if (colon >= 8 && colon <= 80) return clean.slice(0, colon);
  return clean;
}
