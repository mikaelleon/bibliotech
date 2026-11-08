import { Directory, File, Paths } from "expo-file-system";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

export type LocalBook = {
  bookId: string;
  userId: string;
  path: string;
  size: number;
  savedAt: string;
  title: string;
  author: string;
  category: string;
};

export type QueuedProgress = {
  bookId: string;
  cfi: string;
  progress: number;
  updatedAt: string;
};

let database: SQLiteDatabase | null = null;

function db(): SQLiteDatabase {
  if (!database) {
    database = openDatabaseSync("elib.db");
    const columns = database.getAllSync<{ name: string }>("pragma table_info(local_books)");
    if (columns.length > 0 && !columns.some((column) => column.name === "user_id")) {
      database.execSync("drop table local_books");
    }
    database.execSync(`
      create table if not exists local_books (
        user_id text not null,
        book_id text not null,
        path text not null,
        size integer not null,
        saved_at text not null,
        title text not null,
        author text not null,
        category text not null,
        primary key (user_id, book_id)
      );
      create table if not exists progress_queue (
        user_id text not null,
        book_id text not null,
        cfi text not null,
        progress real not null,
        updated_at text not null,
        primary key (user_id, book_id)
      );
    `);
  }
  return database;
}

function booksDir(userId: string): Directory {
  const dir = new Directory(Paths.document, "books", userId);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function bookFile(userId: string, bookId: string): File {
  return new File(booksDir(userId), `${bookId}.epub`);
}

const select = "select book_id as bookId, user_id as userId, path, size, saved_at as savedAt, title, author, category from local_books";

export function localBook(userId: string, bookId: string): LocalBook | null {
  if (!userId) return null;
  const row = db().getFirstSync<LocalBook>(`${select} where user_id = ? and book_id = ?`, userId, bookId);
  if (!row) return null;
  const file = new File(row.path);
  if (!file.exists) {
    db().runSync("delete from local_books where user_id = ? and book_id = ?", userId, bookId);
    return null;
  }
  return row;
}

export function localBooks(userId: string): LocalBook[] {
  if (!userId) return [];
  const rows = db().getAllSync<LocalBook>(`${select} where user_id = ? order by saved_at desc`, userId);
  return rows.filter((row) => {
    const file = new File(row.path);
    if (file.exists) return true;
    db().runSync("delete from local_books where user_id = ? and book_id = ?", userId, row.bookId);
    return false;
  });
}

export async function downloadBookFile(
  url: string,
  userId: string,
  bookId: string,
  onProgress: (fraction: number) => void,
): Promise<File> {
  const destination = bookFile(userId, bookId);
  if (destination.exists) destination.delete();
  const task = File.createDownloadTask(url, destination, {
    onProgress({ bytesWritten, totalBytes }) {
      onProgress(totalBytes > 0 ? bytesWritten / totalBytes : 0);
    },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error("The download stopped. Try again. It won't use another download.");
  return file;
}

export function rememberBook(book: LocalBook): void {
  db().runSync(
    `insert into local_books (user_id, book_id, path, size, saved_at, title, author, category)
     values (?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(user_id, book_id) do update set
       path = excluded.path, size = excluded.size, saved_at = excluded.saved_at,
       title = excluded.title, author = excluded.author, category = excluded.category`,
    book.userId,
    book.bookId,
    book.path,
    book.size,
    book.savedAt,
    book.title,
    book.author,
    book.category,
  );
}

export function forgetBook(userId: string, bookId: string): void {
  const row = localBook(userId, bookId);
  if (row) {
    const file = new File(row.path);
    if (file.exists) file.delete();
  }
  db().runSync("delete from local_books where user_id = ? and book_id = ?", userId, bookId);
}

export function forgetUser(userId: string): void {
  for (const row of localBooks(userId)) forgetBook(userId, row.bookId);
  db().runSync("delete from progress_queue where user_id = ?", userId);
}

export function queueReading(userId: string, bookId: string, cfi: string, progress: number, updatedAt: string): void {
  db().runSync(
    `insert into progress_queue (user_id, book_id, cfi, progress, updated_at)
     values (?, ?, ?, ?, ?)
     on conflict(user_id, book_id) do update set cfi = excluded.cfi, progress = excluded.progress, updated_at = excluded.updated_at`,
    userId,
    bookId,
    cfi,
    progress,
    updatedAt,
  );
}

export function queuedReading(userId: string, bookId: string): QueuedProgress | null {
  return db().getFirstSync<QueuedProgress>(
    "select book_id as bookId, cfi, progress, updated_at as updatedAt from progress_queue where user_id = ? and book_id = ?",
    userId,
    bookId,
  );
}

export function queuedReadings(userId: string): QueuedProgress[] {
  return db().getAllSync<QueuedProgress>(
    "select book_id as bookId, cfi, progress, updated_at as updatedAt from progress_queue where user_id = ?",
    userId,
  );
}

export function dropQueuedReading(userId: string, bookId: string): void {
  db().runSync("delete from progress_queue where user_id = ? and book_id = ?", userId, bookId);
}
