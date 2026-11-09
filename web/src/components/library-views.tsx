"use client";

import { useEffect, useState, type ReactNode } from "react";

import { DeviceDownloads } from "@/components/download-history";
import { PageHeader } from "@/components/page-header";
import { SortedShelf } from "@/components/sorted-shelf";
import { useShelf, type Shelf } from "@/components/shelf-provider";
import { savedBooks, type SavedBook } from "@/lib/offline-books";
import { useIndicator } from "@/lib/use-indicator";
import type { Book } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "library" | "downloaded";

/** Library shelf, with the books saved in this browser shown on the same page. */
export function LibraryViews({
  lede,
  books,
  sort,
  options,
  shelf,
  empty,
  catalog,
}: {
  lede: ReactNode;
  books: Book[];
  sort: string;
  options: { value: string; label: string }[];
  shelf: Shelf;
  empty: ReactNode;
  catalog: Book[];
}) {
  const { userId } = useShelf();
  const [view, setView] = useState<View>("library");
  const [local, setLocal] = useState<SavedBook[] | null>(null);
  const toggle = <ViewToggle value={view} onChange={setView} />;

  useEffect(() => {
    let live = true;
    void savedBooks(userId ?? "").then((rows) => {
      if (live) setLocal(rows);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  const shelfIds = new Set(books.map((book) => book.id));
  const onDevice = (local ?? []).filter((item) => !shelfIds.has(item.bookId));
  const shelfEmpty = books.length === 0;
  const deviceInstead = local !== null && shelfEmpty && local.length > 0;

  if (view === "downloaded") {
    return (
      <>
        <PageHeader title="Library" lede="Books saved in this browser." />
        {toggle}
        <DeviceDownloads catalog={catalog} />
      </>
    );
  }

  return (
    <SortedShelf
      title="Library"
      lede={deviceInstead ? "Books saved in this browser." : lede}
      books={books}
      sort={sort}
      options={options}
      shelf={shelf}
      empty={deviceInstead ? <DeviceDownloads catalog={catalog} /> : local === null ? null : empty}
      belowHeader={toggle}
      footer={!shelfEmpty && onDevice.length > 0 ? <DeviceDownloads ids={onDevice.map((item) => item.bookId)} catalog={catalog} /> : null}
    />
  );
}

function ViewToggle({ value, onChange }: { value: View; onChange: (next: View) => void }) {
  const { containerRef, indicatorRef } = useIndicator<HTMLDivElement>(value);
  const items: { id: View; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "downloaded", label: "Downloaded" },
  ];

  return (
    <div ref={containerRef} role="group" aria-label="Library view" className="relative isolate flex gap-2">
      <span ref={indicatorRef} aria-hidden className="nav-indicator -z-10 rounded-xl bg-primary opacity-0" />
      {items.map((item) => {
        const on = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            data-indicator-target={on}
            onClick={() => onChange(item.id)}
            className={cn(
              "press relative inline-flex min-h-11 items-center rounded-xl px-4 text-sm leading-5",
              on
                ? "text-primary-foreground"
                : "text-foreground before:absolute before:inset-0 before:-z-20 before:rounded-xl before:bg-card before:transition-colors before:duration-[var(--dur-hover)] hover:before:bg-border",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
