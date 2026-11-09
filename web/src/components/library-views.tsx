"use client";

import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";

import { BookCard } from "@/components/book-card";
import { BookMarks } from "@/components/book-marks";
import { CatalogSort } from "@/components/catalog-sort";
import { DeviceDownloads } from "@/components/download-history";
import { PageHeader } from "@/components/page-header";
import { ShelfGrid } from "@/components/shelf-grid";
import { useShelf, type Shelf } from "@/components/shelf-provider";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroupAction, deleteGroupAction, removeFromGroupsAction } from "@/lib/actions";
import { bookGridClass } from "@/lib/book-grid-class";
import { sortBooks } from "@/lib/books";
import { kindLabel, type CollectionGroup, type CollectionKind } from "@/lib/collection";
import { removeSavedBook, savedBooks, type SavedBook } from "@/lib/offline-books";
import { replaceSearch } from "@/lib/replace-search";
import type { Book } from "@/lib/types";

type PageId = "library" | "reading_list" | "collection" | "downloaded";

const pages: { id: PageId; label: string }[] = [
  { id: "library", label: "Library" },
  { id: "reading_list", label: "Reading lists" },
  { id: "collection", label: "Collections" },
  { id: "downloaded", label: "Downloaded" },
];

/** Library shelf, then reading lists, collections, and the books saved in this browser, one page at a time. */
export function LibraryViews({
  lede,
  books,
  sort,
  options,
  shelf,
  empty,
  catalog,
  groups: initialGroups,
}: {
  lede: ReactNode;
  books: Book[];
  sort: string;
  options: { value: string; label: string }[];
  shelf: Shelf;
  empty: ReactNode;
  catalog: Book[];
  groups: CollectionGroup[];
}) {
  const shelfState = useShelf();
  const { toast } = useToast();
  const userId = shelfState.userId;
  const [page, setPage] = useState(0);
  const [local, setLocal] = useState<SavedBook[] | null>(null);
  const [groups, setGroups] = useState(initialGroups);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refresh, setRefresh] = useState(0);
  const [currentSort, setCurrentSort] = useState(sort);
  const groupKey = initialGroups.map((group) => `${group.id}:${group.bookIds.join(",")}`).join("|");
  const [seenGroups, setSeenGroups] = useState(groupKey);
  if (seenGroups !== groupKey) {
    setSeenGroups(groupKey);
    setGroups(initialGroups);
  }

  useEffect(() => {
    let live = true;
    void savedBooks(userId ?? "").then((rows) => {
      if (live) setLocal(rows);
    });
    return () => {
      live = false;
    };
  }, [userId, refresh]);

  const current = pages[page] ?? pages[0];
  const kindGroups = groups.filter((group) => group.kind === current.id);
  const shelfIds = new Set(books.map((book) => book.id));
  const ordered = currentSort === "title" || currentSort === "author" ? sortBooks(books, currentSort) : books;
  const canSelect =
    current.id === "downloaded"
      ? (local?.length ?? 0) > 0
      : current.id === "library"
        ? books.length > 0
        : kindGroups.some((group) => group.bookIds.some((id) => shelfIds.has(id)));

  function show(next: number) {
    setPage(Math.min(Math.max(next, 0), pages.length - 1));
    setSelecting(false);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((currentIds) => {
      const next = new Set(currentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cancel() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function removeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (current.id === "reading_list" || current.id === "collection") {
      const ok = await removeFromGroupsAction(ids, current.id);
      if (!ok) {
        toast("We couldn't update that list. Try again.");
        return;
      }
      setGroups((rows) => rows.map((group) => group.kind === current.id ? { ...group, bookIds: group.bookIds.filter((id) => !selected.has(id)) } : group));
      toast(ids.length === 1 ? "Removed from the list" : `Removed ${ids.length} books from the list`);
      cancel();
      return;
    }
    if (!userId) return;
    if (current.id === "library") {
      const single = ids.length === 1;
      if (single) await shelfState.set("library", ids[0], false);
      else {
        for (const id of ids) await shelfState.set("library", id, false, { silent: true });
        toast(ids.length === 1 ? "Removed 1 book" : `Removed ${ids.length} books`);
      }
      setGroups((rows) => rows.map((group) => ({ ...group, bookIds: group.bookIds.filter((id) => !selected.has(id)) })));
    } else {
      for (const id of ids) await removeSavedBook(userId, id);
      toast(ids.length === 1 ? "Removed 1 saved book" : `Removed ${ids.length} saved books`);
      setRefresh((value) => value + 1);
    }
    cancel();
  }

  async function removeGroup(id: string) {
    const ok = await deleteGroupAction(id);
    if (!ok) {
      toast("We couldn't delete that. Try again.");
      return;
    }
    setGroups((rows) => rows.filter((group) => group.id !== id));
  }

  const ledeFor =
    current.id === "library"
      ? lede
      : current.id === "downloaded"
        ? "Books saved in this browser."
        : current.id === "reading_list"
          ? "Lists you can read through. A book with no list stays on Library."
          : "Named groups. A book with no collection stays on Library.";

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <LibraryPager index={page} onChange={show} />
      {canSelect ? (
        <button
          type="button"
          aria-pressed={selecting}
          aria-label={selecting ? "Cancel selection" : current.id === "library" || current.id === "downloaded" ? "Select books to remove" : "Select books to take out of this page"}
          onClick={() => (selecting ? cancel() : setSelecting(true))}
          className="press inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground"
        >
          {selecting ? <X size={20} strokeWidth={1.5} aria-hidden /> : <Trash2 size={20} strokeWidth={1.5} aria-hidden />}
        </button>
      ) : null}
    </div>
  );

  const selectionBar = selecting ? (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm leading-5">{selected.size === 1 ? "1 selected" : `${selected.size} selected`}</p>
      <Button disabled={selected.size === 0} onClick={() => void removeSelected()}>
        {current.id === "reading_list" || current.id === "collection" ? "Remove from list" : "Remove"}
      </Button>
      <Button variant="outline" onClick={cancel}>Cancel</Button>
    </div>
  ) : null;

  return (
    <>
      <PageHeader
        title={current.label}
        lede={ledeFor}
        action={
          current.id === "library" ? (
            <Suspense>
              <CatalogSort
                value={currentSort}
                options={options}
                onValueChange={(next) => {
                  setCurrentSort(next);
                  replaceSearch({ sort: next === options[0]?.value ? null : next });
                }}
              />
            </Suspense>
          ) : null
        }
      />
      {controls}
      {selectionBar}
      {current.id === "library" ? (
        <ShelfGrid shelf={shelf} books={ordered} empty={local === null ? null : empty} selecting={selecting} selected={selected} onToggle={toggle} />
      ) : null}
      {current.id === "downloaded" ? (
        <DeviceDownloads catalog={catalog} selecting={selecting} selected={selected} onToggle={toggle} note refresh={refresh} />
      ) : null}
      {current.id === "reading_list" || current.id === "collection" ? (
        <GroupPage
          kind={current.id}
          groups={kindGroups}
          books={books}
          saved={new Set((local ?? []).map((item) => item.bookId))}
          selecting={selecting}
          selected={selected}
          onToggle={toggle}
          onDelete={(id) => void removeGroup(id)}
          onCreated={(group) => setGroups((rows) => [...rows, group])}
        />
      ) : null}
    </>
  );
}

function LibraryPager({ index, onChange }: { index: number; onChange: (next: number) => void }) {
  const current = pages[index] ?? pages[0];
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous page"
        disabled={index === 0}
        onClick={() => onChange(index - 1)}
        className="press inline-flex size-11 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
      >
        <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
      </button>
      <div className="min-w-36 text-center">
        <p className="text-sm leading-5 font-medium">{current.label}</p>
        <p className="text-xs leading-4 text-muted-foreground">{index + 1} of {pages.length}</p>
      </div>
      <button
        type="button"
        aria-label="Next page"
        disabled={index === pages.length - 1}
        onClick={() => onChange(index + 1)}
        className="press inline-flex size-11 items-center justify-center rounded-full border border-border bg-card disabled:opacity-40"
      >
        <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}

function GroupPage({
  kind,
  groups,
  books,
  saved,
  selecting,
  selected,
  onToggle,
  onDelete,
  onCreated,
}: {
  kind: CollectionKind;
  groups: CollectionGroup[];
  books: Book[];
  saved: Set<string>;
  selecting: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCreated: (group: CollectionGroup) => void;
}) {
  const byId = new Map(books.map((book) => [book.id, book]));
  const label = kindLabel(kind);
  return (
    <div className="grid gap-10">
      <NewGroup kind={kind} onCreated={onCreated} />
      {groups.length === 0 ? (
        <p className="text-sm leading-5 text-muted-foreground">No {kind === "reading_list" ? "reading lists" : "collections"} yet.</p>
      ) : (
        groups.map((group) => {
          const items = group.bookIds.flatMap((id) => {
            const book = byId.get(id);
            return book ? [book] : [];
          });
          return (
            <section key={group.id} className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl leading-7 font-medium">{group.name}</h2>
                <button
                  type="button"
                  aria-label={`Delete ${label} ${group.name}`}
                  onClick={() => onDelete(group.id)}
                  className="press inline-flex size-11 items-center justify-center rounded-full text-foreground hover:bg-card"
                >
                  <Trash2 size={20} strokeWidth={1.5} aria-hidden />
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm leading-5 text-muted-foreground">No books in this {label.toLowerCase()} yet. Add one from its book page.</p>
              ) : (
                <ul className={bookGridClass}>
                  {items.map((book) => (
                    <li key={book.id} className="min-w-0">
                      <BookCard
                        book={book}
                        showCategory
                        selecting={selecting}
                        selected={selected.has(book.id)}
                        onToggleSelect={() => onToggle(book.id)}
                        corner={selecting ? undefined : <BookMarks bookId={book.id} title={book.title} downloaded={saved.has(book.id)} />}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function NewGroup({ kind, onCreated }: { kind: CollectionKind; onCreated: (group: CollectionGroup) => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const label = kindLabel(kind);

  async function create() {
    setBusy(true);
    const result = await createGroupAction(name, kind);
    setBusy(false);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    onCreated({ id: result.id, name: name.trim(), kind, bookIds: [] });
    setName("");
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void create();
      }}
    >
      <label className="grid min-w-56 flex-1 gap-2 text-sm leading-5">
        New {label.toLowerCase()}
        <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder={kind === "reading_list" ? "Summer reading" : "Poetry"} />
      </label>
      <Button type="submit" disabled={busy || name.trim().length === 0}>Create</Button>
    </form>
  );
}
