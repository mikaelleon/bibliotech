"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BookCard } from "@/components/book-card";
import { useShelf } from "@/components/shelf-provider";
import { Button } from "@/components/ui/button";
import { bookGridClass } from "@/lib/book-grid-class";
import { savedBooks, type SavedBook } from "@/lib/offline-books";
import type { Book, Category } from "@/lib/types";

type HistoryItem = {
  id: string;
  title: string;
  author: string;
  firstDownloadedAt: string;
  lastDownloadedAt: string;
  times: number;
  device: string | null;
  devices: string[];
};

function deviceLine(devices: string[]): string {
  if (devices.length === 0) return "Device not recorded";
  if (devices.length === 1) return `On ${devices[0]}`;
  return `On ${devices.slice(0, -1).join(", ")} and ${devices[devices.length - 1]}`;
}

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

/** Account record of downloads, newest first. A repeat save does not use another download. */
export function DownloadHistory({ used, limit }: { used: number; limit: number }) {
  const { userId } = useShelf();
  const [rows, setRows] = useState<HistoryItem[]>([]);
  const [offline, setOffline] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
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
  }, [userId]);

  const ordered = [...rows].sort((a, b) => Date.parse(b.lastDownloadedAt || b.firstDownloadedAt) - Date.parse(a.lastDownloadedAt || a.firstDownloadedAt));
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
        <ol className="m-0 grid list-none p-0">
          {ordered.map((item, index) => {
            const when = item.lastDownloadedAt || item.firstDownloadedAt;
            const again = item.times > 1 && item.firstDownloadedAt && item.firstDownloadedAt !== item.lastDownloadedAt;
            return (
              <li key={item.id} className="grid grid-cols-[12px_1fr] gap-x-4">
                <div className="flex flex-col items-center">
                  <span aria-hidden className="mt-1 size-3 shrink-0 rounded-full bg-brand" />
                  {index < ordered.length - 1 ? <span aria-hidden className="mt-1 w-px flex-1 bg-border" /> : null}
                </div>
                <div className={index < ordered.length - 1 ? "pb-8" : undefined}>
                  <time dateTime={when} className="text-xs leading-4 font-medium text-muted-foreground">{dateLabel(when)}</time>
                  <div className="mt-2 rounded-xl bg-card px-4 py-3">
                    <Link href={`/books/${item.id}`} className="text-sm font-medium text-inherit no-underline">{item.title}</Link>
                    <p className="text-sm text-muted-foreground">{item.author}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Last downloaded {dateLabel(when)}</p>
                    <p className="text-sm text-muted-foreground">{deviceLine(item.devices ?? (item.device ? [item.device] : []))}{item.times > 1 ? ` · ${item.times} times` : ""}</p>
                    {again ? <p className="text-xs leading-4 text-muted-foreground">First downloaded {dateLabel(item.firstDownloadedAt)}. Saving it again does not use a download.</p> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

/** Books saved in this browser. Removing one frees space and does not refund a download. */
export function DeviceDownloads({
  ids,
  catalog,
  selecting = false,
  selected,
  onToggle,
  note = false,
  refresh = 0,
}: {
  ids?: string[];
  catalog: Book[];
  selecting?: boolean;
  selected?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
  note?: boolean;
  refresh?: number;
}) {
  const { userId } = useShelf();
  const [local, setLocal] = useState<SavedBook[]>([]);
  const [ready, setReady] = useState(false);

  async function reload() {
    const rows = userId ? await savedBooks(userId) : [];
    setLocal(rows);
    setReady(true);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refresh]);

  const shown = ids ? local.filter((item) => ids.includes(item.bookId)) : local;

  return (
    <div className="grid gap-4">
      {!ready ? null : (
        <>
      {note && shown.length > 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">
          Removing a saved book frees space. It does not refund a download, and the book stays in download history.
        </p>
      ) : null}
      {shown.length === 0 ? (
        ids ? null : (
        <div className="max-w-[560px] py-8">
          <h2 className="section-title">Nothing on this device yet</h2>
          <div className="mt-6">
            <Button asChild variant="outline"><Link href="/browse">Browse books</Link></Button>
          </div>
        </div>
        )
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
                  selecting={selecting}
                  selected={selected?.has(item.bookId)}
                  onToggleSelect={() => onToggle?.(item.bookId)}
                />
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}
    </div>
  );
}
