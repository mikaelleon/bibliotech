import JSZip from "jszip";

export type EpubChapter = {
  id: string;
  title: string;
  html: string;
  text: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}="([^"]+)"`));
  return match ? decodeXml(match[1]) : null;
}

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function joinPath(base: string, href: string): string {
  if (!base) return href.replace(/^\.\//, "");
  const parts = base.split("/");
  parts.pop();
  for (const piece of href.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

/** Open an EPUB from bytes. Chapters follow the spine. HTML is the chapter file, text is markup stripped. */
export async function readEpub(data: ArrayBuffer): Promise<EpubChapter[]> {
  const zip = await JSZip.loadAsync(data);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("This file is not an EPUB.");
  const root = container.match(/full-path="([^"]+)"/)?.[1];
  if (!root) throw new Error("This EPUB has no package.");
  const opf = await zip.file(root)?.async("string");
  if (!opf) throw new Error("This EPUB has no package.");

  const manifest = new Map<string, string>();
  for (const tag of opf.match(/<item\b[^>]*>/g) ?? []) {
    const id = attr(tag, "id");
    const href = attr(tag, "href");
    if (id && href) manifest.set(id, href);
  }
  const spine = (opf.match(/<itemref\b[^>]*>/g) ?? [])
    .map((tag) => attr(tag, "idref"))
    .filter((id): id is string => Boolean(id));

  const titles = new Map<string, string>();
  const navHref = [...opf.matchAll(/<item\b[^>]*>/g)].find((match) => /properties="[^"]*nav/.test(match[0]));
  const navPath = navHref ? attr(navHref[0], "href") : null;
  if (navPath) {
    const nav = await zip.file(joinPath(root, navPath))?.async("string");
    for (const link of nav?.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? []) {
      const href = attr(link, "href")?.split("#")[0];
      const label = strip(link);
      if (href && label) titles.set(href, label);
    }
  }

  const chapters: EpubChapter[] = [];
  for (const id of spine) {
    const href = manifest.get(id);
    if (!href || !/\.x?html?$/i.test(href)) continue;
    const file = joinPath(root, href);
    const html = (await zip.file(file)?.async("string")) ?? "";
    if (!html) continue;
    const heading = strip(html.match(/<h[1-3]\b[^>]*>[\s\S]*?<\/h[1-3]>/i)?.[0] ?? "");
    chapters.push({
      id,
      title: titles.get(href) || heading || `Chapter ${chapters.length + 1}`,
      html: html.replace(/<script[\s\S]*?<\/script>/gi, ""),
      text: strip(html),
    });
  }
  if (chapters.length === 0) throw new Error("This EPUB has no chapters.");
  return chapters;
}

/** Split plain text into sentences, each short enough for one speech call. */
export function sentencesOf(text: string, maxLength: number): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const sentences: string[] = [];
  for (const part of parts) {
    if (part.length <= maxLength) {
      sentences.push(part);
      continue;
    }
    for (let index = 0; index < part.length; index += maxLength) sentences.push(part.slice(index, index + maxLength));
  }
  return sentences;
}

/** Spine position stored as a CFI that names the chapter, not a character offset. */
export function cfiForChapter(index: number): string {
  return `epubcfi(/6/${(index + 1) * 2})`;
}

export function chapterFromCfi(cfi: string | null, count: number): number {
  const match = cfi?.match(/\/6\/(\d+)/);
  if (!match) return 0;
  const index = Math.floor(Number(match[1]) / 2) - 1;
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(index, Math.max(0, count - 1));
}
