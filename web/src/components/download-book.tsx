"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Dialog } from "@/components/dialog";
import { useShelf } from "@/components/shelf-provider";
import { Button } from "@/components/ui/button";
import { readEpub } from "@/lib/epub";
import { removeSavedBook, saveBook, savedBook } from "@/lib/offline-books";
import { publishQuota, resetLabel } from "@/lib/quota";

type Props = {
  bookId: string;
  title: string;
  author: string;
  category: string;
  hasFile: boolean;
  fileSize?: number;
  attribution?: string;
  sourceName: string;
  /** A reader account. Visitors and administrators get an explanation instead of the button. */
  canDownload: boolean;
  admin: boolean;
  used: number;
  limit: number;
  verified: boolean;
  resetsAt: string | null;
};

type Phase = "idle" | "working" | "failed";

export function DownloadBook(props: Props) {
  const { userId } = useShelf();
  const [usedCount, setUsedCount] = useState<number | null>(null);
  const [onDevice, setOnDevice] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<string | null>(null);
  const [quotaOpen, setQuotaOpen] = useState(false);

  useEffect(() => {
    let live = true;
    if (!userId) return;
    void savedBook(userId, props.bookId).then((row) => {
      if (live) setOnDevice(Boolean(row));
    });
    return () => {
      live = false;
    };
  }, [props.bookId, userId]);

  async function start(confirmRepeat: boolean) {
    setPhase("working");
    setError(null);
    setProgress(0.05);
    const response = await fetch(`/api/books/${props.bookId}/download`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceLabel: "Web", confirmRepeat }),
    });
    const body = (await response.json()) as {
      url?: string;
      used?: number;
      error?: { code?: string; message?: string; lastDownloadedAt?: string };
    };
    if (response.status === 409) {
      setPhase("idle");
      setRepeat(body.error?.lastDownloadedAt ?? new Date().toISOString());
      return;
    }
    if (response.status === 403 && body.error?.code === "QUOTA_EXCEEDED") {
      setPhase("idle");
      setQuotaOpen(true);
      return;
    }
    if (!response.ok || !body.url) {
      setPhase("failed");
      setError(body.error?.message ?? "The download didn't start.");
      return;
    }
    try {
      const file = await fetch(body.url);
      if (!file.ok) throw new Error("The file link expired. Try again. It won't use another download.");
      const bytes = await file.arrayBuffer();
      setProgress(0.7);
      await readEpub(bytes.slice(0));
      if (!userId) throw new Error("Log in to save a book on this device.");
      await saveBook({
        userId,
        bookId: props.bookId,
        meta: { title: props.title, author: props.author, category: props.category },
        fileBlob: new Blob([bytes], { type: "application/epub+zip" }),
        savedAt: new Date().toISOString(),
        size: bytes.byteLength,
      });
      setOnDevice(true);
      setPhase("idle");
      setProgress(1);
      if (typeof body.used === "number") {
        setUsedCount(body.used);
        publishQuota(body.used);
      }
    } catch (cause) {
      setPhase("failed");
      setError(cause instanceof Error ? cause.message : "Saving the file failed. Try again. It won't use another download.");
    }
  }

  const reset = resetLabel(props.resetsAt);
  const quotaLine = props.canDownload
    ? `${usedCount ?? props.used} of ${props.limit} downloads used${reset ? `. Resets on ${reset}` : ""}.`
    : null;
  const size = props.fileSize ? `${(props.fileSize / (1024 * 1024)).toFixed(1)} MB` : null;

  return (
    <div className="mt-4 grid gap-3">
      <p className="text-sm leading-5 text-muted-foreground">
        Public domain. Source: {props.sourceName}.
        {props.attribution && props.attribution !== `Source: ${props.sourceName}` ? ` ${props.attribution}.` : ""}
        {size ? ` File size ${size}.` : ""}
      </p>
      {quotaLine ? <p className="text-sm leading-5 text-muted-foreground">{quotaLine}</p> : null}
      {props.admin ? <p className="text-sm leading-5">Administrator accounts manage the library on the website. They do not download books.</p> : null}
      {!props.canDownload && !props.admin ? (
        <p className="text-sm leading-5">
          <Link href="/register" className="text-brand-text underline">Create an account</Link> to download books.
        </p>
      ) : null}
      {props.canDownload && props.hasFile && onDevice ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/read/${props.bookId}`}>Read</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (userId) void removeSavedBook(userId, props.bookId).then(() => setOnDevice(false));
            }}
          >
            Remove from device
          </Button>
        </div>
      ) : null}
      {props.canDownload && props.hasFile && !onDevice ? (
        <Button disabled={phase === "working"} onClick={() => void start(false)}>
          {phase === "working" ? "Downloading" : "Download"}
        </Button>
      ) : null}
      {props.canDownload && !props.hasFile ? <p className="text-sm leading-5 text-muted-foreground">This book has no file yet.</p> : null}
      {phase === "working" ? (
        <div className="h-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i className="block h-full bg-brand" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      ) : null}
      {error ? <p className="text-sm leading-5 text-destructive">{error}</p> : null}

      <Dialog
        open={repeat !== null}
        onOpenChange={(open) => { if (!open) setRepeat(null); }}
        title="You already downloaded this book"
        footer={
          <>
            <Button variant="outline" onClick={() => setRepeat(null)}>Cancel</Button>
            <Button onClick={() => { setRepeat(null); void start(true); }}>Download again</Button>
          </>
        }
      >
        You saved it on {repeat ? new Date(repeat).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "an earlier date"}. Downloading it again to this device does not use any of your downloads.
      </Dialog>

      <Dialog
        open={quotaOpen}
        onOpenChange={setQuotaOpen}
        title="No downloads left this month"
        footer={
          <Button asChild variant="outline">
            <Link href="/downloads">Download history</Link>
          </Button>
        }
      >
        {props.verified
          ? `You've used all ${props.limit} downloads this month. They reset on ${reset ?? "the next period"}.`
          : "You've used all 5 downloads this month. Verify your email to unlock 5 more."}
      </Dialog>
    </div>
  );
}
