/**
 * Catalog importer. Runs on this machine, never inside the apps.
 *
 *   node import.mjs --limit 30
 *   node import.mjs --dry-run --limit 30
 *   node import.mjs --ids 1342,84,2701
 *   node import.mjs --source gutenberg --limit 220
 *
 * Reads SUPABASE_URL and SUPABASE_SECRET_KEY from the environment or web/.env.local.
 * Files come from the Gutenberg robot harvest, at least 2 seconds apart. Gutendex supplies metadata only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

import { FILE_CAP, catalogBooks, categoryFor, chooseEdition, cleanTitle, flipAuthor, nextHarvestUrl, normalizeKey, parseHarvest, uniqueSlug } from "./lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = path.join(root, "docs", "catalog-report.md");

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return true;
  return value;
}

function parseIds(value) {
  if (value === true || value == null || value === "") return [];
  return String(value)
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function ebookId(url) {
  const match = String(url ?? "").match(/\/ebooks\/(\d+)/);
  return match ? match[1] : null;
}

function loadEnv() {
  const file = path.join(root, "web", ".env.local");
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  } catch {
    // The environment may already hold the keys.
  }
}

async function fetchOk(url, headers, timeout = 60000) {
  let reason = "request failed";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers });
      if (response.ok) return response;
      reason = String(response.status);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      reason = error instanceof Error ? error.message : "request failed";
    }
    await sleep(2000 * 2 ** attempt);
  }
  throw new Error(reason);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function gutendex(limit) {
  const books = [];
  let url = "https://gutendex.com/books?languages=en&copyright=false&mime_type=application/epub";
  while (url && books.length < limit) {
    const response = await fetchOk(url);
    const page = await response.json();
    books.push(...page.results);
    url = page.next;
  }
  return books.slice(0, limit);
}

const CATALOG_CSV = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv";

/** Gutendex first. The weekly Gutenberg CSV is the fallback when that service does not answer. */
async function loadCandidates(limit) {
  try {
    const books = await gutendex(limit);
    if (books.length > 0) return { books, metadata: "Gutendex" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    console.log(`Gutendex unavailable (${message}). Reading the Gutenberg catalog CSV.`);
  }
  const response = await fetchOk(CATALOG_CSV, { "user-agent": "bibliotech-import/1.0 (catalog import)" }, 120000);
  return { books: catalogBooks(await response.text()).slice(0, limit), metadata: "Gutenberg catalog CSV" };
}

/** Metadata for an explicit id list. The weekly CSV is enough; Gutendex is not required. */
async function resolveIds(ids) {
  const wanted = new Set(ids);
  try {
    const response = await fetchOk(CATALOG_CSV, { "user-agent": "bibliotech-import/1.0 (catalog import)" }, 120000);
    const order = new Map(ids.map((id, index) => [id, index]));
    const books = catalogBooks(await response.text())
      .filter((book) => wanted.has(book.id))
      .sort((a, b) => order.get(a.id) - order.get(b.id));
    if (books.length > 0) return { books, metadata: "Gutenberg catalog CSV" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    console.log(`Catalog CSV unavailable (${message}).`);
  }
  return {
    books: ids.map((id) => ({
      id,
      title: `Gutenberg ${id}`,
      authors: [{ name: "Unknown" }],
      subjects: [],
      bookshelves: [],
      summaries: [],
    })),
    metadata: "id list",
  };
}

/**
 * Walk harvest pages until every wanted id has a URL, or the list ends.
 * Two seconds between pages, per the Gutenberg robot policy.
 */
async function harvest(edition, wanted) {
  const found = new Map();
  let url = `https://www.gutenberg.org/robot/harvest?filetypes[]=${edition}&langs[]=en`;
  const seen = new Set();
  let pages = 0;
  while (url && !seen.has(url) && pages < 80) {
    seen.add(url);
    pages += 1;
    const response = await fetchOk(url, { "user-agent": "bibliotech-import/1.0 (catalog import; 2s delay)" });
    const body = await response.text();
    for (const [id, fileUrl] of parseHarvest(body)) {
      if (!found.has(id)) found.set(id, fileUrl);
    }
    const pending = [...wanted].filter((id) => !found.has(id));
    if (pending.length === 0) break;
    const next = nextHarvestUrl(body, url);
    if (!next) break;
    url = next;
    await sleep(2000);
  }
  console.log(`${edition}: ${found.size} files across ${pages} page${pages === 1 ? "" : "s"}.`);
  return found;
}

/** Harvest is the allowed list. When it is down, use the PGLAF cache for the candidate ids only. */
function mirrorLists(wanted) {
  const images = new Map();
  const plain = new Map();
  for (const id of wanted) {
    images.set(id, `https://aleph.pglaf.org/cache/epub/${id}/pg${id}-images.epub`);
    plain.set(id, `https://aleph.pglaf.org/cache/epub/${id}/pg${id}.epub`);
  }
  return { images, plain };
}

async function fileLists(wanted) {
  try {
    const images = await harvest("epub.images", wanted);
    const plain = await harvest("epub.noimages", wanted);
    if (images.size > 0 || plain.size > 0) return { images, plain, files: "Gutenberg harvest" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    console.log(`Harvest unavailable (${message}). Using the PGLAF cache for these ids only.`);
  }
  return { ...mirrorLists(wanted), files: "PGLAF cache (robot/harvest is unavailable)" };
}

async function downloadFile(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000), headers: { "user-agent": "bibliotech-import/1.0 (catalog import; 2s delay)" } });
  if (!response.ok) throw new Error(`File ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > FILE_CAP) return { tooBig: true, size: length, bytes: null };
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > FILE_CAP) return { tooBig: true, size: bytes.byteLength, bytes: null };
  return { tooBig: false, size: bytes.byteLength, bytes };
}

async function validEpub(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const container = zip.file("META-INF/container.xml");
  if (!container) return false;
  const xml = await container.async("string");
  if (!xml.includes("rootfile")) return false;
  const texts = await Promise.all(
    Object.values(zip.files)
      .filter((file) => !file.dir && /\.(txt|html|xhtml)$/i.test(file.name))
      .slice(0, 8)
      .map((file) => file.async("string")),
  );
  const joined = texts.join("\n").toLowerCase();
  return joined.includes("gutenberg") || joined.includes("public domain");
}

function summaryOf(book) {
  const text = book.summaries?.[0] ?? "";
  return text.slice(0, 600);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const idList = parseIds(arg("ids", ""));
  const limit = idList.length || Number(arg("limit", 30));
  const source = String(arg("source", "gutenberg"));
  if (source !== "gutenberg") {
    console.log("Only --source gutenberg is automated. Standard Ebooks stays a hand list in scripts/data/standard-ebooks.txt.");
    return;
  }
  if (!Number.isFinite(limit) || limit < 1) throw new Error("--limit must be a positive number");

  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!dryRun && (!url || !key)) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (web/.env.local).");

  if (idList.length) console.log(`Resolving ${idList.length} Gutenberg ids.`);
  else console.log(`Fetching metadata (up to ${limit * 3} candidates).`);
  const { books: candidates, metadata } = idList.length ? await resolveIds(idList) : await loadCandidates(limit * 3);
  console.log(`${candidates.length} candidates from ${metadata}.`);
  const wanted = new Set(candidates.map((book) => book.id));
  console.log("Fetching the Gutenberg harvest lists.");
  const { images, plain, files } = await fileLists(wanted);

  const planned = [];
  const seen = new Set();
  for (const book of candidates) {
    if (planned.length >= limit) break;
    const author = flipAuthor(book.authors?.[0]?.name ?? "Unknown");
    const keyName = normalizeKey(book.title, author);
    if (seen.has(keyName)) continue;
    const choice = chooseEdition(
      images.has(book.id) ? { url: images.get(book.id), size: null } : null,
      plain.has(book.id) ? { url: plain.get(book.id), size: null } : null,
    );
    if (!choice) continue;
    seen.add(keyName);
    planned.push({ book, author, choice });
  }

  const failures = [];
  const imported = [];
  const slugs = new Set();
  const supabase = dryRun ? null : createClient(url, key, { auth: { persistSession: false } });

  if (!dryRun) {
    const { data: existing, error } = await supabase.from("books").select("id, slug, title, author, source, source_id, source_url");
    if (error) throw new Error(error.message);
    for (const row of existing ?? []) slugs.add(row.slug);
    var rows = existing ?? [];
  } else {
    var rows = [];
  }

  for (const item of planned) {
    const { book, author, choice } = item;
    process.stdout.write(`#${book.id} ${book.title.slice(0, 60)} … `);
    if (dryRun) {
      console.log("dry-run");
      imported.push({ id: book.id, title: book.title, author, category: categoryFor(book.subjects ?? [], book.bookshelves ?? []), bytes: 0 });
      continue;
    }
    await sleep(2000);
    let file;
    try {
      try {
        file = await downloadFile(choice.url);
      } catch (error) {
        if (choice.edition !== "images" || !plain.has(book.id)) throw error;
        await sleep(2000);
        file = await downloadFile(plain.get(book.id));
      }
      if (file.tooBig && choice.edition === "images" && plain.has(book.id)) {
        await sleep(2000);
        file = await downloadFile(plain.get(book.id));
      }
      if (file.tooBig || !file.bytes) {
        failures.push({ id: book.id, title: book.title, reason: "over 5 MB" });
        console.log("over 5 MB");
        continue;
      }
      if (!(await validEpub(file.bytes))) {
        failures.push({ id: book.id, title: book.title, reason: "not a licensed EPUB" });
        console.log("invalid");
        continue;
      }
    } catch (error) {
      failures.push({ id: book.id, title: book.title, reason: error.message });
      console.log(error.message);
      continue;
    }

    const category = categoryFor(book.subjects ?? [], book.bookshelves ?? []);
    const gutenbergId = String(book.id);
    const match =
      rows.find((row) => row.source === "gutenberg" && row.source_id === gutenbergId) ??
      rows.find((row) => ebookId(row.source_url) === gutenbergId) ??
      rows.find((row) => normalizeKey(row.title, row.author) === normalizeKey(book.title, author));
    const slug = match?.slug ?? uniqueSlug(book.title, slugs);
    slugs.add(slug);
    const storagePath = `gutenberg/${book.id}.epub`;
    const record = {
      slug,
      title: cleanTitle(book.title).slice(0, 300),
      author: author.slice(0, 200),
      category,
      language: "English",
      published: book.authors?.[0]?.death_year ? String(book.authors[0].death_year) : null,
      license: "Public Domain",
      source_name: "Project Gutenberg",
      source_url: `https://www.gutenberg.org/ebooks/${book.id}`,
      summary: summaryOf(book),
      source: "gutenberg",
      source_id: String(book.id),
      file_path: storagePath,
      file_size_bytes: file.size,
      attribution: "Source: Project Gutenberg",
    };

    const upload = await supabase.storage.from("books").upload(storagePath, file.bytes, {
      contentType: "application/epub+zip",
      upsert: true,
    });
    if (upload.error) {
      failures.push({ id: book.id, title: book.title, reason: upload.error.message });
      console.log(upload.error.message);
      continue;
    }
    const fileFields = {
      source: "gutenberg",
      source_id: String(book.id),
      file_path: storagePath,
      file_size_bytes: file.size,
      attribution: "Source: Project Gutenberg",
    };
    const saved = match
      ? await supabase.from("books").update(fileFields).eq("id", match.id).select("id, slug, title, author, source, source_id, source_url").single()
      : await supabase.from("books").insert(record).select("id, slug, title, author, source, source_id, source_url").single();
    if (saved.error) {
      failures.push({ id: book.id, title: book.title, reason: saved.error.message });
      console.log(saved.error.message);
      continue;
    }
    rows.push(saved.data);
    imported.push({ id: book.id, title: book.title, author, category, bytes: file.size });
    console.log(`${category}, ${file.size} bytes`);
  }

  const byCategory = new Map();
  let total = 0;
  for (const book of imported) {
    byCategory.set(book.category, (byCategory.get(book.category) ?? 0) + 1);
    total += book.bytes;
  }
  const lines = [
    "# Catalog report",
    "",
    dryRun ? `Dry run (${metadata}; ${files}). No files were downloaded and nothing was written.` : `Imported ${imported.length} books. Metadata: ${metadata}. Files: ${files}.`,
    "",
    `| Category | Books |`,
    `|---|---|`,
    ...[...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, count]) => `| ${label} | ${count} |`),
    "",
    `Total file size: ${total} bytes.`,
    "",
    "License: public domain in the US (`copyright=false` on Gutendex). Each EPUB is stored unmodified. Attribution on the book is “Source: Project Gutenberg”.",
    "",
    failures.length ? `Failures (${failures.length}):` : "No failures.",
    ...failures.map((failure) => `- ${failure.id} ${failure.title}: ${failure.reason}`),
    "",
  ];
  writeFileSync(reportPath, lines.join("\n"));
  console.log(`Wrote ${reportPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "import failed";
  writeFileSync(
    reportPath,
    ["# Catalog report", "", "The import stopped before any book was saved.", "", message, ""].join("\n"),
  );
  console.error(message);
  process.exit(1);
});
