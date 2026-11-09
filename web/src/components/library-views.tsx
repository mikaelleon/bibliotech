"use client";

import { BookOpen, Check, Clock, Filter, LayoutGrid, List, MoreHorizontal, Plus, Type, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

import { BookCard } from "@/components/book-card";
import { BookCover } from "@/components/book-cover";
import { Dialog } from "@/components/dialog";
import { EmptyState } from "@/components/empty-state";
import { useShelf } from "@/components/shelf-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  addToCollectionAction,
  createGroupAction,
  deleteGroupAction,
  removeFromCollectionAction,
  removeLibraryBooksAction,
  renameGroupAction,
  restoreLibraryBooksAction,
  setProgressAction,
} from "@/lib/actions";
import { bookGridClass } from "@/lib/book-grid-class";
import type { CollectionGroup, ReadingProgress } from "@/lib/collection";
import { openCollectionPicker } from "@/lib/collection-picker";
import { readEpub } from "@/lib/epub";
import { useIndicator } from "@/lib/use-indicator";
import { removeSavedBook, saveBook, savedBooks, type SavedBook } from "@/lib/offline-books";
import { publishQuota } from "@/lib/quota";
import { CATEGORIES, type Book, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export type LibraryView = "all" | "reading" | "finished" | "collections" | "on-device";

const tabs: { id: LibraryView; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading" },
  { id: "finished", label: "Finished" },
  { id: "collections", label: "Collections" },
  { id: "on-device", label: "On this device" },
];

const sortChoices = [
  { value: "read", label: "Recently read", icon: BookOpen },
  { value: "added", label: "Recently added", icon: Clock },
  { value: "title", label: "Title", icon: Type },
  { value: "author", label: "Author", icon: UserRound },
];

function libraryHref(view: LibraryView, sort: string, defaultSort: string, collectionId?: string) {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (sort !== defaultSort) params.set("sort", sort);
  if (collectionId) params.set("c", collectionId);
  const query = params.toString();
  return query ? `/library?${query}` : "/library";
}

function placeFromLocation(defaultSort: string): { view: LibraryView; sort: string; collectionId?: string } {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("view");
  const view = tabs.some((tab) => tab.id === raw) ? (raw as LibraryView) : "all";
  const requested = params.get("sort");
  const sort = requested === "read" || requested === "added" || requested === "title" || requested === "author" ? requested : defaultSort;
  const collectionId = view === "collections" ? params.get("c") ?? undefined : undefined;
  return { view, sort, collectionId };
}

function modifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function categoryOf(value: string): Category {
  return (CATEGORIES as readonly string[]).includes(value) ? (value as Category) : "Fiction";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const layoutListeners = new Set<() => void>();

function readLayout(): "grid" | "list" {
  return localStorage.getItem("elib.library.layout") === "list" ? "list" : "grid";
}

function subscribeLayout(onChange: () => void) {
  layoutListeners.add(onChange);
  return () => {
    layoutListeners.delete(onChange);
  };
}

function writeLayout(next: "grid" | "list") {
  localStorage.setItem("elib.library.layout", next);
  for (const listener of layoutListeners) listener();
}

function orderBooks(list: Book[], sort: string, progress: Record<string, ReadingProgress>, addedAt: Record<string, string>): Book[] {
  const next = [...list];
  if (sort === "title") next.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "author") next.sort((a, b) => a.author.localeCompare(b.author));
  else if (sort === "read") next.sort((a, b) => (progress[b.id]?.updatedAt ?? "").localeCompare(progress[a.id]?.updatedAt ?? ""));
  else next.sort((a, b) => (addedAt[b.id] ?? "").localeCompare(addedAt[a.id] ?? ""));
  return next;
}

/** Library: what you're reading, collections, and the files on this device. */
export function LibraryViews({
  books,
  groups: initialGroups,
  progress: initialProgress,
  addedAt,
  catalog,
  view: initialView,
  sort: initialSort,
  defaultSort,
  collectionId: initialCollectionId,
  empty,
}: {
  books: Book[];
  groups: CollectionGroup[];
  progress: ReadingProgress[];
  addedAt: Record<string, string>;
  catalog: Book[];
  view: LibraryView;
  sort: string;
  defaultSort: string;
  collectionId?: string;
  empty: ReactNode;
}) {
  const shelf = useShelf();
  const { toast } = useToast();
  const userId = shelf.userId;
  const [groups, setGroups] = useState(initialGroups);
  const [marks, setMarks] = useState<Record<string, ReadingProgress>>(() => Object.fromEntries(initialProgress.map((row) => [row.bookId, row])));
  const [local, setLocal] = useState<SavedBook[] | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const layout = useSyncExternalStore(subscribeLayout, readLayout, () => "grid" as const);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<CollectionGroup | null>(null);
  const [rename, setRename] = useState("");
  const [deleting, setDeleting] = useState<CollectionGroup | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState(initialView);
  const [sort, setSort] = useState(initialSort);
  const [collectionId, setCollectionId] = useState(initialCollectionId);

  const groupKey = initialGroups.map((group) => `${group.id}:${group.name}:${group.bookIds.join(",")}`).join("|");
  const [seenGroups, setSeenGroups] = useState(groupKey);
  if (seenGroups !== groupKey) {
    setSeenGroups(groupKey);
    setGroups(initialGroups);
  }
  const progressKey = initialProgress.map((row) => `${row.bookId}:${row.progress}:${row.updatedAt}`).join("|");
  const [seenProgress, setSeenProgress] = useState(progressKey);
  if (seenProgress !== progressKey) {
    setSeenProgress(progressKey);
    setMarks(Object.fromEntries(initialProgress.map((row) => [row.bookId, row])));
  }
  const incoming = `${initialView}:${initialSort}:${initialCollectionId ?? ""}`;
  const [seenIncoming, setSeenIncoming] = useState(incoming);
  if (seenIncoming !== incoming) {
    setSeenIncoming(incoming);
    setView(initialView);
    setSort(initialSort);
    setCollectionId(initialCollectionId);
    setSelecting(false);
    setSelected(new Set());
  }

  useEffect(() => {
    function onPop() {
      const next = placeFromLocation(defaultSort);
      setView(next.view);
      setSort(next.sort);
      setCollectionId(next.collectionId);
      setSelecting(false);
      setSelected(new Set());
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [defaultSort]);

  useEffect(() => {
    let live = true;
    void savedBooks(userId ?? "").then((rows) => {
      if (live) setLocal(rows);
    });
    return () => {
      live = false;
    };
  }, [userId]);

  const onDevice = new Set((local ?? []).map((row) => row.bookId));
  const shelfBooks = books.filter((book) => shelf.has("library", book.id));
  const readingCount = shelfBooks.filter((book) => {
    const value = marks[book.id]?.progress ?? 0;
    return value > 0 && value < 1;
  }).length;
  const total = shelf.count("library");
  const lede = readingCount > 0 ? `${readingCount} reading · ${total} in Library` : `${total} in Library`;
  const openGroup = view === "collections" && collectionId ? groups.find((group) => group.id === collectionId) : undefined;

  function visit(viewNext: LibraryView, collectionNext?: string, sortNext = sort) {
    const moved = viewNext !== view || (collectionNext ?? "") !== (collectionId ?? "");
    setView(viewNext);
    setSort(sortNext);
    setCollectionId(collectionNext);
    if (moved) {
      setSelecting(false);
      setSelected(new Set());
    }
    const href = libraryHref(viewNext, sortNext, defaultSort, collectionNext);
    const current = `${window.location.pathname}${window.location.search}`;
    if (href !== current) window.history.pushState(null, "", href);
  }

  function progressValue(id: string): number | undefined {
    const value = marks[id]?.progress;
    if (value === undefined || value <= 0) return undefined;
    return value;
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function chooseLayout(next: "grid" | "list") {
    writeLayout(next);
  }

  function remember(bookId: string, progress: number) {
    setMarks((current) => ({
      ...current,
      [bookId]: { bookId, progress, updatedAt: new Date().toISOString() },
    }));
  }

  function bookFromSaved(row: SavedBook): Book {
    return (
      catalog.find((book) => book.id === row.bookId) ??
      books.find((book) => book.id === row.bookId) ?? {
        id: row.bookId,
        title: row.meta.title,
        author: row.meta.author,
        category: categoryOf(row.meta.category),
        language: "English",
        license: "Public domain",
        sourceName: "",
        sourceUrl: "",
        summary: "",
      }
    );
  }

  const deviceBooks = (local ?? []).map(bookFromSaved);
  const pool =
    view === "on-device"
      ? deviceBooks
      : view === "reading"
        ? shelfBooks.filter((book) => {
            const value = marks[book.id]?.progress ?? 0;
            return value > 0 && value < 1;
          })
        : view === "finished"
          ? shelfBooks.filter((book) => (marks[book.id]?.progress ?? 0) >= 1)
          : view === "collections" && openGroup
            ? shelfBooks.filter((book) => openGroup.bookIds.includes(book.id))
            : shelfBooks;
  const shown = orderBooks(pool, sort, marks, addedAt);
  const continueReading =
    view === "all"
      ? orderBooks(
          shelfBooks.filter((book) => {
            const value = marks[book.id]?.progress ?? 0;
            return value > 0 && value < 1;
          }),
          "read",
          marks,
          addedAt,
        ).slice(0, 6)
      : [];
  const canSelect = view === "collections" && !openGroup ? false : shown.length > 0;
  const selectedBooks = shown.filter((book) => selected.has(book.id));
  const anyOnDevice = selectedBooks.some((book) => onDevice.has(book.id));
  const allFavorite = selectedBooks.length > 0 && selectedBooks.every((book) => shelf.has("favorites", book.id));

  async function removeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (openGroup) {
      const previous = openGroup.bookIds;
      setGroups((rows) => rows.map((group) => (group.id === openGroup.id ? { ...group, bookIds: group.bookIds.filter((id) => !selected.has(id)) } : group)));
      const ok = await removeFromCollectionAction(openGroup.id, ids);
      if (!ok) {
        setGroups((rows) => rows.map((group) => (group.id === openGroup.id ? { ...group, bookIds: previous } : group)));
        toast("We couldn't update that collection. Try again.");
        return;
      }
      toast(ids.length === 1 ? `Removed from ${openGroup.name}` : `Removed ${ids.length} books from ${openGroup.name}`, {
        label: "Undo",
        onClick: () => {
          setGroups((rows) => rows.map((group) => (group.id === openGroup.id ? { ...group, bookIds: previous } : group)));
          void addToCollectionAction(openGroup.id, ids);
        },
      });
      setSelecting(false);
      setSelected(new Set());
      return;
    }
    for (const id of ids) await shelf.set("library", id, false, { silent: true, local: true });
    const result = await removeLibraryBooksAction(ids);
    if (!result.ok) {
      for (const id of ids) await shelf.set("library", id, true, { silent: true, local: true });
      toast("Couldn't update your Library. Try again.");
      return;
    }
    const groupsHit = new Set(result.memberships.map((row) => row.collectionId)).size;
    const message =
      ids.length === 1
        ? groupsHit === 0
          ? "Removed from Library"
          : `Removed from Library and ${groupsHit === 1 ? "1 collection" : `${groupsHit} collections`}`
        : groupsHit === 0
          ? `Removed ${ids.length} books from Library`
          : `Removed ${ids.length} books from Library and ${groupsHit === 1 ? "1 collection" : `${groupsHit} collections`}`;
    toast(message, {
      label: "Undo",
      onClick: () => {
        for (const id of ids) void shelf.set("library", id, true, { silent: true, local: true });
        void restoreLibraryBooksAction(ids, result.memberships, addedAt);
      },
    });
    setSelecting(false);
    setSelected(new Set());
  }

  async function favoriteSelected() {
    const ids = [...selected];
    const on = !allFavorite;
    for (const id of ids) await shelf.set("favorites", id, on, { silent: true });
    toast(on ? "Added to favorites" : "Removed from favorites");
    setSelecting(false);
    setSelected(new Set());
  }

  async function removeDownloads() {
    if (!userId) return;
    const ids = selectedBooks.filter((book) => onDevice.has(book.id)).map((book) => book.id);
    for (const id of ids) await removeSavedBook(userId, id);
    setLocal((rows) => (rows ?? []).filter((row) => !ids.includes(row.bookId)));
    toast(ids.length === 1 ? "Removed download. It stays in your Library." : `Removed ${ids.length} downloads. They stay in your Library.`);
    setSelecting(false);
    setSelected(new Set());
  }

  async function createCollection() {
    setBusy(true);
    const result = await createGroupAction(newName);
    setBusy(false);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    setGroups((rows) => [...rows, { id: result.id, name: result.name, bookIds: [] }]);
    setNewName("");
    setCreating(false);
  }

  async function renameCollection() {
    if (!renaming) return;
    setBusy(true);
    const result = await renameGroupAction(renaming.id, rename);
    setBusy(false);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    setGroups((rows) => rows.map((group) => (group.id === renaming.id ? { ...group, name: rename.trim() } : group)));
    setRenaming(null);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const ok = await deleteGroupAction(deleting.id);
    setBusy(false);
    if (!ok) {
      toast("We couldn't delete that. Try again.");
      return;
    }
    setGroups((rows) => rows.filter((group) => group.id !== deleting.id));
    setDeleting(null);
  }

  const menu = (book: Book) => (
    <LibraryMenu
      book={book}
      progress={progressValue(book.id)}
      onDevice={onDevice.has(book.id)}
      onMarked={remember}
      onDeviceChange={(id, present) => {
        if (!present) setLocal((rows) => (rows ?? []).filter((row) => row.bookId !== id));
        else void savedBooks(userId ?? "").then(setLocal);
      }}
    />
  );

  let body: ReactNode;
  if (view === "collections" && !openGroup) {
    body =
      groups.length === 0 ? (
        <EmptyState title="No collections yet" icon={null} action={<Button onClick={() => setCreating(true)}>New collection</Button>}>
          Group books, like Poetry or Summer reading.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {groups.map((group) => {
            const covers = shelfBooks.filter((book) => group.bookIds.includes(book.id)).slice(0, 3);
            return (
              <li key={group.id} className="flex items-center gap-4">
                <a
                  href={libraryHref("collections", sort, defaultSort, group.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 no-underline"
                  onClick={(event) => {
                    if (modifiedClick(event)) return;
                    event.preventDefault();
                    visit("collections", group.id);
                  }}
                >
                  <span className="flex shrink-0 gap-1">
                    {covers.map((book) => (
                      <span key={book.id} className="w-8 max-w-8 shrink-0 basis-8 overflow-hidden">
                        <BookCover book={book} decorative />
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm leading-5 font-medium">{group.name}</span>
                    <span className="block text-xs leading-4 text-muted-foreground">
                      {group.bookIds.length === 1 ? "1 book" : `${group.bookIds.length} books`}
                    </span>
                  </span>
                </a>
                <CollectionMenu group={group} onRename={() => { setRenaming(group); setRename(group.name); }} onDelete={() => setDeleting(group)} />
              </li>
            );
          })}
        </ul>
      );
  } else if (shown.length === 0 && view === "all") {
    body = empty;
  } else if (shown.length === 0 && view === "reading") {
    body = (
      <EmptyState title="Nothing in progress" icon={null} action={<Button variant="outline" onClick={() => visit("all")}>Browse your Library</Button>}>
        Open a book from your Library to start.
      </EmptyState>
    );
  } else if (shown.length === 0 && view === "finished") {
    body = (
      <EmptyState title="No finished books yet" icon={null}>
        Books you finish show up here.
      </EmptyState>
    );
  } else if (shown.length === 0 && view === "on-device") {
    body = (
      <EmptyState title="Nothing on this device yet" icon={null} action={<Button variant="outline" onClick={() => visit("all")}>Browse your Library</Button>}>
        Download a book from its page to read it offline here.
      </EmptyState>
    );
  } else if (layout === "list") {
    body = (
      <ul className="grid gap-3">
        {shown.map((book) => (
          <li key={book.id}>
            <LibraryRow
              book={book}
              progress={progressValue(book.id)}
              onDevice={onDevice.has(book.id)}
              selecting={selecting}
              selected={selected.has(book.id)}
              onToggle={() => toggle(book.id)}
              menu={menu(book)}
            />
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <ul className={bookGridClass}>
        {shown.map((book) => (
          <li key={book.id} className="min-w-0">
            <BookCard
              book={book}
              showCategory
              progress={progressValue(book.id)}
              onDevice={onDevice.has(book.id)}
              selecting={selecting}
              selected={selected.has(book.id)}
              onToggleSelect={() => toggle(book.id)}
              corner={menu(book)}
            />
          </li>
        ))}
      </ul>
    );
  }

  const deviceBytes = (local ?? []).reduce((sum, row) => sum + row.size, 0);

  return (
    <div className={cn("grid gap-6", selecting && "pb-28")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Library</h1>
          <p className="mt-2 text-base leading-6 text-muted-foreground">{lede}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSelect && !selecting ? (
            <button type="button" onClick={() => setSelecting(true)} className="press inline-flex h-11 items-center rounded-xl px-3 text-sm leading-5 font-medium">
              Select
            </button>
          ) : null}
          {view === "collections" && !openGroup ? (
            <button type="button" aria-label="New collection" onClick={() => setCreating(true)} className="press inline-flex size-11 items-center justify-center rounded-xl">
              <Plus size={16} strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label="Filter" className={cn("press inline-flex size-11 items-center justify-center rounded-xl", sort !== defaultSort && "bg-card")}>
              <Filter size={16} strokeWidth={1.5} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {sortChoices.map((choice) => {
                const Icon = choice.icon;
                const on = choice.value === sort;
                return (
                  <DropdownMenuItem key={choice.value} aria-checked={on} onSelect={() => visit(view, collectionId, choice.value)} className="gap-2">
                    <Icon size={16} strokeWidth={1.5} aria-hidden />
                    <span className="flex-1">{choice.label}</span>
                    {on ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex gap-1" role="group" aria-label="Layout">
            <button type="button" aria-pressed={layout === "grid"} aria-label="Grid" onClick={() => chooseLayout("grid")} className={cn("press inline-flex size-11 items-center justify-center rounded-xl", layout === "grid" && "bg-card")}>
              <LayoutGrid size={16} strokeWidth={1.5} aria-hidden />
            </button>
            <button type="button" aria-pressed={layout === "list"} aria-label="List" onClick={() => chooseLayout("list")} className={cn("press inline-flex size-11 items-center justify-center rounded-xl", layout === "list" && "bg-card")}>
              <List size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <LibraryTabs view={view} sort={sort} defaultSort={defaultSort} onVisit={(next) => visit(next)} />

      {view === "on-device" ? (
        <div className="grid gap-1 text-sm leading-5 text-muted-foreground">
          <p>
            {(local ?? []).length === 1 ? "1 book" : `${(local ?? []).length} books`} · {formatBytes(deviceBytes)} on this device
          </p>
          <p>
            Files saved in this browser for offline reading. Books downloaded on other devices are in{" "}
            <Link href="/downloads" className="text-brand-text underline">
              Download history
            </Link>
            .
          </p>
        </div>
      ) : null}

      {openGroup ? (
        <a
          href={libraryHref("collections", sort, defaultSort)}
          className="text-sm leading-5 text-brand-text underline"
          onClick={(event) => {
            if (modifiedClick(event)) return;
            event.preventDefault();
            visit("collections");
          }}
        >
          Back
        </a>
      ) : null}

      {continueReading.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="text-base leading-6 font-medium">Continue reading</h2>
          <ul className="flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
            {continueReading.map((book) => {
              const value = marks[book.id]?.progress ?? 0;
              return (
                <li key={book.id} className="flex w-64 shrink-0 items-center gap-3 md:w-auto">
                  <span className="w-11 max-w-11 shrink-0 basis-11 overflow-hidden">
                    <BookCover book={book} decorative />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-5 font-medium">{book.title}</p>
                    <p className="text-xs leading-4 text-muted-foreground">{Math.round(value * 100)}%</p>
                    <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-border" aria-hidden>
                      <i className="block h-full bg-foreground" style={{ width: `${Math.round(value * 100)}%` }} />
                    </div>
                  </div>
                  <Link href={`/read/${book.id}`} className="shrink-0 text-sm leading-5 font-medium text-brand-text underline">
                    Resume
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {view === "all" && shown.length > 0 ? <h2 className="text-base leading-6 font-medium">All books</h2> : null}
      {body}

      {selecting ? (
        <div
          role="toolbar"
          aria-label="Selection"
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center gap-2 border-t border-border bg-card px-4 py-3 md:bottom-0"
        >
          <p aria-live="polite" className="mr-auto text-sm leading-5">
            {selected.size} selected
          </p>
          <Button variant="outline" disabled={selected.size === 0} onClick={() => openCollectionPicker([...selected])}>
            Add to collection
          </Button>
          <Button variant="outline" disabled={selected.size === 0} onClick={() => void favoriteSelected()}>
            {allFavorite ? "Remove from favorites" : "Favorite"}
          </Button>
          {anyOnDevice ? (
            <Button variant="outline" onClick={() => void removeDownloads()}>
              Remove download
            </Button>
          ) : null}
          <Button disabled={selected.size === 0} onClick={() => void removeSelected()}>
            {openGroup ? `Remove from ${openGroup.name}` : "Remove from Library"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSelecting(false);
              setSelected(new Set());
            }}
          >
            Done
          </Button>
        </div>
      ) : null}

      <Dialog
        open={creating}
        onOpenChange={setCreating}
        title="New collection"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button disabled={busy || newName.trim().length === 0} onClick={() => void createCollection()}>Create</Button>
          </>
        }
      >
        <label className="grid gap-2 text-sm leading-5" htmlFor="collection-name">
          Name
          <Input id="collection-name" value={newName} maxLength={80} onChange={(event) => setNewName(event.target.value)} />
        </label>
      </Dialog>
      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
        title="Rename collection"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button disabled={busy || rename.trim().length === 0} onClick={() => void renameCollection()}>Save</Button>
          </>
        }
      >
        <label className="grid gap-2 text-sm leading-5" htmlFor="rename-collection">
          Name
          <Input id="rename-collection" value={rename} maxLength={80} onChange={(event) => setRename(event.target.value)} />
        </label>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={deleting ? `Delete ${deleting.name}?` : "Delete collection?"}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button disabled={busy} onClick={() => void confirmDelete()}>Delete</Button>
          </>
        }
      >
        {deleting ? `Its ${deleting.bookIds.length === 1 ? "1 book stays" : `${deleting.bookIds.length} books stay`} in your Library.` : null}
      </Dialog>
    </div>
  );
}

function LibraryTabs({ view, sort, defaultSort, onVisit }: { view: LibraryView; sort: string; defaultSort: string; onVisit: (view: LibraryView) => void }) {
  const { containerRef, indicatorRef } = useIndicator<HTMLElement>(view);
  return (
    <nav ref={containerRef} aria-label="Library" className="relative flex gap-1 overflow-x-auto border-b border-border">
      <span ref={indicatorRef} aria-hidden className="nav-indicator bg-foreground opacity-0" />
      {tabs.map((tab) => {
        const current = tab.id === view;
        return (
          <a
            key={tab.id}
            href={libraryHref(tab.id, sort, defaultSort)}
            aria-current={current ? "page" : undefined}
            onClick={(event) => {
              if (modifiedClick(event)) return;
              event.preventDefault();
              if (!current) onVisit(tab.id);
            }}
            className={cn(
              "relative inline-flex h-11 shrink-0 items-center px-3 text-sm leading-5 no-underline",
              current ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {tab.label}
            {current ? <span data-indicator-target="true" className="absolute inset-x-0 bottom-0 h-0.5" /> : null}
          </a>
        );
      })}
    </nav>
  );
}

function CollectionMenu({ group, onRename, onDelete }: { group: CollectionGroup; onRename: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Actions for ${group.name}`} className="press inline-flex size-11 items-center justify-center rounded-xl">
        <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LibraryMenu({
  book,
  progress,
  onDevice,
  onMarked,
  onDeviceChange,
}: {
  book: Book;
  progress?: number;
  onDevice: boolean;
  onMarked: (bookId: string, progress: number) => void;
  onDeviceChange: (bookId: string, present: boolean) => void;
}) {
  const shelf = useShelf();
  const { toast } = useToast();
  const favorite = shelf.has("favorites", book.id);
  const inProgress = progress !== undefined && progress < 1;

  async function download() {
    if (!shelf.userId) return;
    const response = await fetch(`/api/books/${book.id}/download`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceLabel: "Web", confirmRepeat: false }),
    });
    const body = (await response.json()) as { url?: string; used?: number; error?: { message?: string } };
    if (response.status === 409) {
      toast("Open the book to save it on this device again.");
      return;
    }
    if (!response.ok || !body.url) {
      toast(body.error?.message ?? "The download didn't start.");
      return;
    }
    try {
      const file = await fetch(body.url);
      if (!file.ok) throw new Error("The file link expired. Try again.");
      const bytes = await file.arrayBuffer();
      await readEpub(bytes.slice(0));
      await saveBook({
        userId: shelf.userId,
        bookId: book.id,
        meta: { title: book.title, author: book.author, category: book.category },
        fileBlob: new Blob([bytes], { type: "application/epub+zip" }),
        savedAt: new Date().toISOString(),
        size: bytes.byteLength,
      });
      onDeviceChange(book.id, true);
      if (typeof body.used === "number") publishQuota(body.used);
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Saving the file failed. Try again.");
    }
  }

  async function removeDownload() {
    if (!shelf.userId) return;
    await removeSavedBook(shelf.userId, book.id);
    onDeviceChange(book.id, false);
    toast("Removed download. It stays in your Library.");
  }

  async function mark(next: number) {
    onMarked(book.id, next);
    const ok = await setProgressAction(book.id, next);
    if (!ok) toast("We couldn't update that. Try again.");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${book.title}`}
        className="press inline-flex size-11 items-center justify-center rounded-full bg-card/90 text-foreground"
      >
        <MoreHorizontal size={16} strokeWidth={1.5} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {inProgress ? (
          <DropdownMenuItem asChild>
            <Link href={`/read/${book.id}`}>Resume</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => openCollectionPicker([book.id])}>Add to collection</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void shelf.set("favorites", book.id, !favorite)}>
          {favorite ? "Remove from favorites" : "Favorite"}
        </DropdownMenuItem>
        {book.hasFile === false ? null : onDevice ? (
          <DropdownMenuItem onSelect={() => void removeDownload()}>Remove download</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => void download()}>Download</DropdownMenuItem>
        )}
        {progress !== undefined && progress >= 1 ? (
          <DropdownMenuItem onSelect={() => void mark(0)}>Mark as unread</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => void mark(1)}>Mark as finished</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void shelf.set("library", book.id, false)}>Remove from Library</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LibraryRow({
  book,
  progress,
  onDevice,
  selecting,
  selected,
  onToggle,
  menu,
}: {
  book: Book;
  progress?: number;
  onDevice: boolean;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  menu: ReactNode;
}) {
  const text = (
    <>
      <span className="w-8 max-w-8 shrink-0 basis-8 overflow-hidden">
        <BookCover book={book} decorative />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm leading-5 font-medium">{book.title}</span>
        <span className="block truncate text-sm leading-5 text-muted-foreground">{book.author}</span>
        {progress !== undefined ? (
          <span className="mt-1 block h-0.5 overflow-hidden rounded-full bg-border" aria-hidden>
            <i className="block h-full bg-foreground" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        ) : null}
        {progress !== undefined || onDevice ? (
          <span className="mt-1 flex gap-2 text-xs leading-4 text-muted-foreground">
            {progress !== undefined ? <span>{progress >= 1 ? "Finished" : `${Math.round(progress * 100)}%`}</span> : null}
            {onDevice ? (
              <span className="inline-flex items-center gap-1">
                <Check size={12} strokeWidth={2} aria-hidden />
                On this device
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-3">
      {selecting ? (
        <button type="button" aria-pressed={selected} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span aria-hidden className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[#20232f]", selected ? "bg-[#20232f] text-white" : "bg-white")}>
            {selected ? <Check size={14} strokeWidth={2} /> : null}
          </span>
          {text}
        </button>
      ) : (
        <Link href={`/books/${book.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-inherit no-underline">
          {text}
        </Link>
      )}
      {selecting ? null : menu}
    </div>
  );
}
