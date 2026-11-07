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

/**
 * Sets the favorite to exactly `on`. Idempotent: calling it twice with the same value changes
 * nothing, so a double tap or a stale button can't flip the state the wrong way.
 * `at` restores a removed favorite to its old position (Undo).
 */
export async function setFavorite(email: string, bookId: string, on: boolean, at?: number): Promise<boolean> {
  if (!getBook(bookId)) return false;
  const rows = await readJson<FavoriteRow>(favoritesPath);
  const index = rows.findIndex((row) => row.userEmail === email && row.bookId === bookId);
  if (on && index < 0) {
    const row = { userEmail: email, bookId };
    if (at === undefined) rows.push(row);
    else {
      // `at` counts this user's rows only. Map it onto the shared file.
      const own = rows.map((item, position) => ({ item, position })).filter(({ item }) => item.userEmail === email);
      const before = own[at]?.position ?? rows.length;
      rows.splice(before, 0, row);
    }
    await writeJson(favoritesPath, rows);
  }
  if (!on && index >= 0) {
    rows.splice(index, 1);
    await writeJson(favoritesPath, rows);
  }
  return on;
}

export async function listLibraryIds(email: string): Promise<string[]> {
  const rows = (await readJson<LibraryRow>(libraryPath))
    .filter((row) => row.userEmail === email)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.map((row) => row.bookId);
}

/**
 * Puts the book on, or takes it off, the user's Library shelf. Idempotent. Adding never uses a
 * download: Library is a shelf, and `downloads` is a separate record (see docs/database.md).
 * `addedAt` keeps the original date when Undo puts a book back, so "Recently added" stays true.
 */
export async function setInLibrary(email: string, bookId: string, on: boolean, addedAt?: string): Promise<boolean> {
  if (!getBook(bookId)) return false;
  const rows = await readJson<LibraryRow>(libraryPath);
  const index = rows.findIndex((row) => row.userEmail === email && row.bookId === bookId);
  if (on && index < 0) {
    rows.push({ userEmail: email, bookId, createdAt: addedAt ?? new Date().toISOString() });
    await writeJson(libraryPath, rows);
  }
  if (!on && index >= 0) {
    rows.splice(index, 1);
    await writeJson(libraryPath, rows);
  }
  return on;
}

/** When each book was added, for Undo. */
export async function libraryAddedAt(email: string): Promise<Record<string, string>> {
  const rows = (await readJson<LibraryRow>(libraryPath)).filter((row) => row.userEmail === email);
  return Object.fromEntries(rows.map((row) => [row.bookId, row.createdAt]));
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
