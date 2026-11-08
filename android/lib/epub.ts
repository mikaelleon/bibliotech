import JSZip from "jszip";

export type EpubChapter = { id: string; title: string; text: string };

function decodeXml(value: string): string {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}="([^"]+)"`));
  return match ? decodeXml(match[1]) : null;
}

function strip(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function joinPath(base: string, href: string): string {
  const parts = base.split("/");
  parts.pop();
  for (const piece of href.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

/** Chapters in spine order. Text is the chapter with markup removed, for reading and Listen. */
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
  const spine = (opf.match(/<itemref\b[^>]*>/g) ?? []).map((tag) => attr(tag, "idref")).filter((id): id is string => Boolean(id));
  const chapters: EpubChapter[] = [];
  for (const id of spine) {
    const href = manifest.get(id);
    if (!href || !/\.x?html?$/i.test(href)) continue;
    const html = (await zip.file(joinPath(root, href))?.async("string")) ?? "";
    const text = strip(html);
    if (!text) continue;
    chapters.push({ id, title: `Chapter ${chapters.length + 1}`, text });
  }
  if (chapters.length === 0) throw new Error("This EPUB has no chapters.");
  return chapters;
}

export function sentencesOf(text: string, maxLength: number): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const mark = text[index] === "." || text[index] === "!" || text[index] === "?";
    const boundary = mark && (index === text.length - 1 || text[index + 1] === " ");
    if (!boundary && index !== text.length - 1) continue;
    const piece = text.slice(start, index + 1).trim();
    start = index + 1;
    if (!piece) continue;
    if (piece.length <= maxLength) sentences.push(piece);
    else for (let offset = 0; offset < piece.length; offset += maxLength) sentences.push(piece.slice(offset, offset + maxLength));
  }
  return sentences;
}

export function cfiForChapter(index: number): string {
  return `epubcfi(/6/${(index + 1) * 2})`;
}

export function chapterFromCfi(cfi: string | null, count: number): number {
  const match = cfi?.match(/\/6\/(\d+)/);
  if (!match) return 0;
  const index = Number(match[1]) / 2 - 1;
  if (!Number.isInteger(index) || index < 0 || index >= count) return 0;
  return index;
}
