import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { getBook, getBooks } from "@/lib/books";
import type { Book } from "@/lib/types";

/**
 * Local stand-in for library_items and favorites.
 * There is no database in this repo. The SQL migration describes the real tables.
 * Rows here match the commented demo seed so the presentation can show a library.
 */

type FavoriteRow = { userEmail: string; bookId: string };
type LibraryRow = { userEmail: string; bookId: string; createdAt: string };

const favoritesPath = path.join(process.cwd(), "data", "favorites.json");
const libraryPath = path.join(process.cwd(), "data", "library.json");

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJson<T>(file: string, rows: T[]): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

function booksFor(ids: string[]): Book[] {
  return ids.map((id) => getBook(id)).filter((book): book is Book => Boolean(book));
}

export async function listFavoriteIds(email: string): Promise<string[]> {
  const rows = await readJson<FavoriteRow>(favoritesPath);
  return rows.filter((row) => row.userEmail === email).map((row) => row.bookId);
}

export async function listFavorites(email: string): Promise<Book[]> {
  return booksFor(await listFavoriteIds(email));
}

export async function isFavorite(email: string, bookId: string): Promise<boolean> {
  const ids = await listFavoriteIds(email);
  return ids.includes(bookId);
}

/** Inserts or deletes the current user's favorite. Returns the new state. */
export async function toggleFavorite(email: string, bookId: string): Promise<boolean> {
  if (!getBook(bookId)) return false;
  const rows = await readJson<FavoriteRow>(favoritesPath);
  const index = rows.findIndex((row) => row.userEmail === email && row.bookId === bookId);
  if (index >= 0) rows.splice(index, 1);
  else rows.push({ userEmail: email, bookId });
  await writeJson(favoritesPath, rows);
  return index < 0;
}

export type LibrarySort = "added" | "title" | "author";

export async function listLibrary(email: string, sort: LibrarySort = "added"): Promise<Book[]> {
  const rows = (await readJson<LibraryRow>(libraryPath))
    .filter((row) => row.userEmail === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const books = booksFor(rows.map((row) => row.bookId));
  if (sort === "title") books.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "author") books.sort((a, b) => a.author.localeCompare(b.author));
  return books;
}

export function countByCategory(): { label: string; count: number }[] {
  const books = getBooks();
  const labels = [...new Set(books.map((book) => book.category))];
  return labels.map((label) => ({
    label,
    count: books.filter((book) => book.category === label).length,
  }));
}
