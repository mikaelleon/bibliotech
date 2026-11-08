import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type SavedBook = {
  key: string;
  userId: string;
  bookId: string;
  meta: { title: string; author: string; category: string };
  fileBlob: Blob;
  savedAt: string;
  size: number;
};

export type QueuedProgress = {
  key: string;
  userId: string;
  bookId: string;
  cfi: string;
  progress: number;
  updatedAt: string;
};

type LibraryDb = DBSchema & {
  books: { key: string; value: SavedBook };
  progress_queue: { key: string; value: QueuedProgress };
};

let database: Promise<IDBPDatabase<LibraryDb>> | null = null;

function deviceKey(userId: string, bookId: string): string {
  return `${userId}:${bookId}`;
}

function db() {
  database ??= openLibrary().catch((error: unknown) => {
    database = null;
    throw error;
  });
  return database;
}

/** Version 2 keys every row by account. A tab still holding version 1 blocks the upgrade, so this fails instead of spinning. */
function openLibrary(): Promise<IDBPDatabase<LibraryDb>> {
  const opened = openDB<LibraryDb>("elib-offline", 2, {
    upgrade(next) {
      if (next.objectStoreNames.contains("books")) next.deleteObjectStore("books");
      if (next.objectStoreNames.contains("progress_queue")) next.deleteObjectStore("progress_queue");
      next.createObjectStore("books", { keyPath: "key" });
      next.createObjectStore("progress_queue", { keyPath: "key" });
    },
    blocking() {
      void database?.then((connection) => {
        connection.close();
        database = null;
      });
    },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Close other E-Library tabs and try again. It will not use another download."));
    }, 4000);
  });
  return Promise.race([opened, stalled]).finally(() => clearTimeout(timer));
}

export async function savedBook(userId: string, bookId: string): Promise<SavedBook | undefined> {
  if (!userId) return undefined;
  return (await db()).get("books", deviceKey(userId, bookId));
}

export async function savedBooks(userId: string): Promise<SavedBook[]> {
  if (!userId) return [];
  const rows = await (await db()).getAll("books");
  return rows.filter((row) => row.userId === userId);
}

export async function saveBook(book: Omit<SavedBook, "key">): Promise<void> {
  const database = await db();
  const tx = database.transaction("books", "readwrite");
  await tx.store.put({ ...book, key: deviceKey(book.userId, book.bookId) });
  await tx.done;
  if (navigator.storage?.persist) void navigator.storage.persist();
}

export async function removeSavedBook(userId: string, bookId: string): Promise<void> {
  if (!userId) return;
  await (await db()).delete("books", deviceKey(userId, bookId));
}

export async function removeAllSaved(userId: string): Promise<void> {
  const rows = await savedBooks(userId);
  const database = await db();
  const tx = database.transaction("books", "readwrite");
  for (const row of rows) await tx.store.delete(row.key);
  await tx.done;
}

export async function queueProgress(entry: Omit<QueuedProgress, "key">): Promise<void> {
  const database = await db();
  const tx = database.transaction("progress_queue", "readwrite");
  await tx.store.put({ ...entry, key: deviceKey(entry.userId, entry.bookId) });
  await tx.done;
}

export async function queuedProgress(userId: string): Promise<QueuedProgress[]> {
  if (!userId) return [];
  const rows = await (await db()).getAll("progress_queue");
  return rows.filter((row) => row.userId === userId);
}

export async function dropQueuedProgress(userId: string, bookId: string): Promise<void> {
  await (await db()).delete("progress_queue", deviceKey(userId, bookId));
}

/** Send this account's queued positions. The API stores the server's clock. */
export async function flushProgress(userId: string): Promise<void> {
  if (!userId || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
  const pending = await queuedProgress(userId);
  for (const entry of pending) {
    const response = await fetch(`/api/books/${entry.bookId}/progress`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (response.ok) await dropQueuedProgress(userId, entry.bookId);
  }
}
