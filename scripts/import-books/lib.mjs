/** Pure helpers for the catalog importer. No network, no database. */

export const FILE_CAP = 5 * 1024 * 1024;

const CATEGORY_RULES = [
  ["Children", /children|juvenile|young adult/i],
  ["Poetry", /poetry|poem|verse/i],
  ["Philosophy", /philosoph/i],
  ["Science", /science|physics|biology|natural history|astronomy|chemistry/i],
  ["Technology", /technology|engineering|invention|electricity/i],
  ["Business", /business|econom|commerce/i],
  ["History", /history|histor/i],
  ["Classics", /classic/i],
  ["Education", /education|school/i],
  ["Fiction", /fiction|novel|literature|adventure/i],
];

/**
 * Gutenberg catalog titles sometimes keep MARC subfields (`$a`, `$b`, `$c`).
 * Keep the title and subtitle. Drop the statement of responsibility.
 */
export function cleanTitle(title) {
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

export function slugify(title) {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "book";
}

/** Gutendex writes "Austen, Jane". The catalog CSV adds a year and a parenthetical: "Kennedy, John F. (John Fitzgerald), 1917-1963". */
export function flipAuthor(name) {
  const cleaned = name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/,?\s+\d{3,4}\??\s*(?:BCE|CE|BC|AD)?\s*-\s*\d{0,4}\??\s*(?:BCE|CE|BC|AD)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 2) return tidyAuthor(`${parts[1]} ${parts[0]}`);
  return tidyAuthor(cleaned || name);
}

/** Already-flipped names: drop a parenthetical and a leading ancient date. */
export function tidyAuthor(name) {
  const cleaned = name.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const leadingDate = cleaned.match(/^\d{3,4}\??\s*(?:BCE|CE|BC|AD)?\s*-\s*\d{0,4}\??\s*(?:BCE|CE|BC|AD)?\s+(.+)$/i);
  return (leadingDate ? leadingDate[1] : cleaned).trim() || name.trim();
}

export function normalizeKey(title, author) {
  const fold = (value) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${fold(title)}|${fold(author)}`;
}

export function categoryFor(subjects, bookshelves) {
  const text = [...subjects, ...bookshelves].join(" ");
  for (const [label, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return label;
  }
  return "Fiction";
}

/** Harvest body → map of Gutenberg id to file URL. */
export function parseHarvest(body) {
  const found = new Map();
  const pattern = /https?:\/\/[^\s"'<>]+\/epub\/(\d+)\/[^\s"'<>]+\.epub/gi;
  for (const match of body.matchAll(pattern)) {
    const id = Number(match[1]);
    if (!found.has(id)) found.set(id, match[0]);
  }
  return found;
}

/**
 * Prefer the images edition. Use the no-images edition when the images file is over the cap.
 * Returns null when both are missing or both are over the cap.
 */
export function chooseEdition(images, noimages) {
  if (images && (images.size == null || images.size <= FILE_CAP)) return { ...images, edition: "images" };
  if (noimages && (noimages.size == null || noimages.size <= FILE_CAP)) return { ...noimages, edition: "noimages" };
  return null;
}

export function uniqueSlug(title, taken) {
  const base = slugify(title);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Next harvest page, the link whose offset is higher than the current page. */
export function nextHarvestUrl(body, current) {
  const base = new URL(current);
  const currentOffset = Number(base.searchParams.get("offset") ?? "0");
  let best = null;
  let bestOffset = currentOffset;
  for (const match of body.matchAll(/href="([^"]*offset=\d+[^"]*)"/gi)) {
    const next = new URL(match[1].replace(/&amp;/g, "&"), base);
    const offset = Number(next.searchParams.get("offset"));
    if (Number.isFinite(offset) && offset > bestOffset) {
      bestOffset = offset;
      best = next.toString();
    }
  }
  return best;
}

/** RFC-style CSV. Quoted fields may contain commas and newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

/** English Text rows from pg_catalog.csv, in catalog order, shaped like a Gutendex book. */
export function catalogBooks(csv) {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const column = Object.fromEntries(header.map((name, index) => [name.trim(), index]));
  const books = [];
  for (const cols of rows) {
    const language = cols[column.Language] ?? "";
    if ((cols[column.Type] ?? "") !== "Text") continue;
    if (!language.split(/[;,]/).some((part) => part.trim() === "en")) continue;
    const id = Number(cols[column["Text#"]]);
    if (!Number.isInteger(id) || id < 1) continue;
    const author = (cols[column.Authors] ?? "").split(";")[0].trim() || "Unknown";
    const split = (value) => value.split(";").map((part) => part.trim()).filter(Boolean);
    books.push({
      id,
      title: cleanTitle(cols[column.Title] ?? "Untitled"),
      authors: [{ name: author }],
      subjects: split(cols[column.Subjects] ?? ""),
      bookshelves: split(cols[column.Bookshelves] ?? ""),
      summaries: [],
    });
  }
  return books;
}
