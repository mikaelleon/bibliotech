"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Dialog } from "@/components/dialog";
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
import { listMyCollectionsAction, saveCollectionPickerAction } from "@/lib/actions";
import type { CollectionGroup } from "@/lib/collection";
import { openCollectionPicker, subscribeCollectionPicker } from "@/lib/collection-picker";
import { cn } from "@/lib/utils";

/** Mount once inside the shelf. "Add to collection" opens this from a toast or a menu. */
export function CollectionPickerHost() {
  const { toast } = useToast();
  const [bookIds, setBookIds] = useState<string[] | null>(null);
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return subscribeCollectionPicker((ids) => {
      setBookIds(ids);
      setName("");
      setBusy(false);
    });
  }, []);

  useEffect(() => {
    if (!bookIds) return;
    let live = true;
    void listMyCollectionsAction().then((rows) => {
      if (!live) return;
      setGroups(rows);
      const only = bookIds.length === 1 ? bookIds[0] : null;
      setChecked(new Set(only ? rows.filter((group) => group.bookIds.includes(only)).map((group) => group.id) : []));
    });
    return () => {
      live = false;
    };
  }, [bookIds]);

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!bookIds) return;
    setBusy(true);
    const result = await saveCollectionPickerAction(bookIds, [...checked], name, bookIds.length === 1);
    setBusy(false);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    setBookIds(null);
  }

  return (
    <Dialog
      open={bookIds !== null}
      onOpenChange={(open) => {
        if (!open) setBookIds(null);
      }}
      title="Add to collection"
      footer={
        <>
          <Button variant="outline" onClick={() => setBookIds(null)}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-2">
        {groups.length === 0 ? <p className="text-sm leading-5 text-muted-foreground">No collections yet.</p> : null}
        {groups.map((group) => (
          <label key={group.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm leading-5">
            <input type="checkbox" checked={checked.has(group.id)} onChange={() => toggle(group.id)} />
            <span>{group.name}</span>
          </label>
        ))}
        <label className="mt-2 grid gap-2 text-sm leading-5" htmlFor="new-collection-name">
          New collection
          <Input id="new-collection-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        </label>
      </div>
    </Dialog>
  );
}

const labelClass =
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm leading-5 font-medium";

/**
 * Add to Library on the book page and on browse cards.
 * A new book is added at once. "In Library" opens a menu instead of removing on the first press.
 */
export function AddToLibrary({ bookId, title, appearance }: { bookId: string; title: string; appearance: "icon" | "label" }) {
  const shelf = useShelf();
  const on = shelf.signedIn && shelf.has("library", bookId);

  function add() {
    if (!shelf.signedIn) {
      shelf.promptSignUp("library");
      return;
    }
    void shelf.set("library", bookId, true);
  }

  if (!on) {
    if (appearance === "icon") {
      return (
        <button
          type="button"
          aria-label={`Add ${title} to Library`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            add();
          }}
          className="press inline-flex size-11 items-center justify-center rounded-full bg-card text-foreground"
        >
          <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
        </button>
      );
    }
    return (
      <button type="button" onClick={add} className={cn(labelClass, "border-border bg-card text-foreground hover:bg-background")}>
        <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
        Add to Library
      </button>
    );
  }

  const triggerClass =
    appearance === "icon"
      ? "press inline-flex size-11 items-center justify-center rounded-full bg-card text-foreground"
      : cn(labelClass, "border-foreground bg-foreground text-background");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={appearance === "icon" ? `In Library: ${title}` : "In Library"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className={triggerClass}
      >
        {appearance === "icon" ? (
          <BookmarkCheck size={16} strokeWidth={1.5} aria-hidden />
        ) : (
          <>
            <BookmarkCheck size={16} strokeWidth={1.5} aria-hidden />
            In Library
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onSelect={() => openCollectionPicker([bookId])}
        >
          Add to collection
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void shelf.set("library", bookId, false)}>Remove from Library</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
