"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useShelf } from "@/components/shelf-provider";
import { Button } from "@/components/ui/button";
import { removeAllSaved, removeSavedBook, savedBooks, type SavedBook } from "@/lib/offline-books";

type HistoryItem = {
  id: string;
  title: string;
  author: string;
  firstDownloadedAt: string;
  times: number;
};

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Account record of downloads. Files on this device live on the Downloads page. */
export function DownloadHistory({ used, limit }: { used: number; limit: number }) {
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
  return (
    <div className="grid gap-4">
      <p className="text-sm leading-5 text-muted-foreground">{used} / {limit}</p>
      {offline ? (
        <p className="text-sm leading-5">
          You are offline. Download history needs a connection. Books on this device are listed above.
        </p>
      ) : null}
      {error ? <p className="text-sm leading-5">{error}</p> : null}
      {!offline && ready && rows.length === 0 ? (
        <div className="max-w-[560px] py-8">
          <h2 className="section-title">Nothing downloaded yet</h2>
          <div className="mt-6">
            <Button asChild variant="outline"><Link href="/browse">Browse books</Link></Button>
          </div>
        </div>
      ) : null}
      {!offline && rows.length > 0 ? (
        <ul className="grid gap-3">
          {rows.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.author} · first saved {dateLabel(item.firstDownloadedAt)} · {item.times} {item.times === 1 ? "time" : "times"}</p>
                <p className="text-xs text-muted-foreground">{onDevice.has(item.id) ? "On this device" : "Downloaded before, not on this device"}</p>
              </div>
              <div className="flex gap-2">
                {onDevice.has(item.id) ? <Button asChild><Link href={`/read/${item.id}`}>Read</Link></Button> : <Button asChild variant="outline"><Link href={`/books/${item.id}`}>Download again</Link></Button>}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Books saved in this browser. Removing one frees space and does not refund a download. */
export function DeviceDownloads() {
  const { userId } = useShelf();
  const [local, setLocal] = useState<SavedBook[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [space, setSpace] = useState<string | null>(null);

  async function reload() {
    const rows = userId ? await savedBooks(userId) : [];
    setLocal(rows);
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

  return (
    <div className="grid gap-4">
      <p className="text-sm leading-5 text-muted-foreground">
        {(total / (1024 * 1024)).toFixed(1)} MB of books. Removing a book frees space and does not refund a download.
        {space ? ` ${space}.` : ""} A browser may clear this storage. A book it clears stays in download history, and you can save it again free.
      </p>
      {local.length === 0 ? (
        <div className="max-w-[560px] py-8">
          <h2 className="section-title">Nothing on this device yet</h2>
          <div className="mt-6">
            <Button asChild variant="outline"><Link href="/browse">Browse books</Link></Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3">
          {local.map((item) => (
            <li key={item.bookId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3">
              <div>
                <p className="text-sm font-medium">{item.meta.title}</p>
                <p className="text-sm text-muted-foreground">{item.meta.author} · {(item.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              <div className="flex gap-2">
                <Button asChild><Link href={`/read/${item.bookId}`}>Read</Link></Button>
                <Button variant="outline" onClick={() => { if (userId) void removeSavedBook(userId, item.bookId).then(reload); }}>Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {local.length > 0 ? (
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
    </div>
  );
}
