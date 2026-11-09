"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BookCard } from "@/components/book-card";
import { BookMarks } from "@/components/book-marks";
import { useShelf } from "@/components/shelf-provider";
import { Button } from "@/components/ui/button";
import { bookGridClass } from "@/lib/book-grid-class";
import { removeAllSaved, removeSavedBook, savedBooks, type SavedBook } from "@/lib/offline-books";
import type { Book, Category } from "@/lib/types";

type HistoryItem = {
  id: string;
  title: string;
  author: string;
  firstDownloadedAt: string;
  times: number;
};

function dateLabel(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function coverBook(id: string, title: string, author: string, catalog: Book[]): Book {
  return (
    catalog.find((book) => book.id === id) ?? {
      id,
      title,
      author,
      category: "Fiction" as Category,
      language: "English",
      license: "Public domain",
      sourceName: "",
      sourceUrl: "",
      summary: "",
    }
  );
}

/** Account record of downloads, newest first. Files on this device live in Library. */
export function DownloadHistory({ used, limit, catalog }: { used: number; limit: number; catalog: Book[] }) {
  const { userId } = useShelf();
  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [local, setLocal] = useState<SavedBook[]>([]);
  const [offline, setOffline] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLocal(userId ? await savedBooks(userId) : []);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setOffline(true);
      setReady(true);
      return;
    }
    const response = await fetch("/api/downloads");
    if (!response.ok) {
      setError("We couldn't load your download history.");
      setReady(true);
      return;
    }
    const body = (await response.json()) as { downloads: HistoryItem[] };
    setRows(body.downloads);
    setOffline(false);
    setError(null);
    setReady(true);
  }

  useEffect(() => {
    const on = () => void reload();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    on();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
    // reload closes over the latest userId. The listeners only need to be current for this account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onDevice = new Set(local.map((item) => item.bookId));
  const ordered = [...rows].sort((a, b) => Date.parse(b.firstDownloadedAt) - Date.parse(a.firstDownloadedAt));
  return (
    <div className="grid gap-4">
      <p className="text-sm leading-5 text-muted-foreground">{used} / {limit}</p>
      {offline ? (
        <p className="text-sm leading-5">
          You are offline. Download history needs a connection.{" "}
          <Link href="/library" className="text-brand-text underline">Books on this device</Link> are in your Library.
        </p>
      ) : null}
      {error ? <p className="text-sm leading-5">{error}</p> : null}
      {!offline && ready && ordered.length === 0 ? (
        <div className="max-w-[560px] py-8">
          <h2 className="section-title">Nothing downloaded yet</h2>
          <div className="mt-6">
            <Button asChild variant="outline"><Link href="/browse">Browse books</Link></Button>
          </div>
        </div>
      ) : null}
      {!offline && ordered.length > 0 ? (
        <ul className={bookGridClass}>
          {ordered.map((item) => {
            const book = coverBook(item.id, item.title, item.author, catalog);
            const here = onDevice.has(item.id);
            return (
              <li key={item.id} className="min-w-0">
                <BookCard
                  book={book}
                  showCategory
                  href={here ? `/read/${item.id}` : `/books/${item.id}`}
                  corner={<BookMarks bookId={item.id} title={item.title} downloaded={here} />}
                  extra={<p className="text-xs leading-4 text-muted-foreground">{dateLabel(item.firstDownloadedAt)} · {item.times} {item.times === 1 ? "time" : "times"}</p>}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Books saved in this browser. They are listed from Library. Removing one frees space and does not refund a download. */
export function DeviceDownloads({ ids, catalog }: { ids?: string[]; catalog: Book[] }) {
  const { userId } = useShelf();
  const [local, setLocal] = useState<SavedBook[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [space, setSpace] = useState<string | null>(null);

  async function reload() {
    const rows = userId ? await savedBooks(userId) : [];
    setLocal(rows);
    setReady(true);
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      setSpace(`${(used / (1024 * 1024)).toFixed(1)} MB used of ${(quota / (1024 * 1024)).toFixed(0)} MB`);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const total = local.reduce((sum, item) => sum + item.size, 0);
  const shown = ids ? local.filter((item) => ids.includes(item.bookId)) : local;

  return (
    <div className="grid gap-4">
      {!ready ? null : (
        <>
      <p className="text-sm leading-5 text-muted-foreground">
        {(total / (1024 * 1024)).toFixed(1)} MB of books. Removing a book frees space and does not refund a download.
        {space ? ` ${space}.` : ""} A browser may clear this storage. A book it clears stays in download history, and you can save it again free.
      </p>
      {shown.length === 0 ? (
        <div className="max-w-[560px] py-8">
          <h2 className="section-title">Nothing on this device yet</h2>
          <div className="mt-6">
            <Button asChild variant="outline"><Link href="/browse">Browse books</Link></Button>
          </div>
        </div>
      ) : (
        <ul className={bookGridClass}>
          {shown.map((item) => {
            const book = coverBook(item.bookId, item.meta.title, item.meta.author, catalog);
            return (
              <li key={item.bookId} className="min-w-0">
                <BookCard
                  book={book}
                  showCategory
                  href={`/read/${item.bookId}`}
                  corner={<BookMarks bookId={item.bookId} title={item.meta.title} downloaded />}
                />
                <div className="mt-3">
                  <Button variant="outline" onClick={() => { if (userId) void removeSavedBook(userId, item.bookId).then(reload); }}>Remove</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length > 0 ? (
        confirm ? (
          <div className="flex gap-2">
            <Button onClick={() => { if (!userId) return; void removeAllSaved(userId).then(() => { setConfirm(false); return reload(); }); }}>Remove all</Button>
            <Button variant="outline" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        ) : (
          <div>
            <Button variant="outline" onClick={() => setConfirm(true)}>Remove all</Button>
          </div>
        )
      ) : null}
        </>
      )}
    </div>
  );
}
