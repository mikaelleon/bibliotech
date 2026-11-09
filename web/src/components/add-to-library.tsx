"use client";

import { BookmarkCheck, BookmarkPlus } from "lucide-react";
import { useEffect, useState } from "react";

import { Dialog } from "@/components/dialog";
import { useShelf } from "@/components/shelf-provider";
import { Swap } from "@/components/swap";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileInLibraryAction, listMyCollectionsAction } from "@/lib/actions";
import { kindLabel, type CollectionGroup, type CollectionKind } from "@/lib/collection";
import { cn } from "@/lib/utils";

type Choice = { mode: "library" } | { mode: "existing"; id: string } | { mode: "new" };

/**
 * Add to Library. The dialog files the book in an existing group, a new one, or the shelf alone.
 * A book already on the shelf is removed instead, which also drops it from every group.
 */
export function AddToLibrary({ bookId, title, appearance }: { bookId: string; title: string; appearance: "icon" | "label" }) {
  const shelf = useShelf();
  const { toast } = useToast();
  const on = shelf.signedIn && shelf.has("library", bookId);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [choice, setChoice] = useState<Choice>({ mode: "library" });
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CollectionKind>("reading_list");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void listMyCollectionsAction().then((rows) => {
      if (live) setGroups(rows);
    });
    return () => {
      live = false;
    };
  }, [open]);

  function press() {
    if (!shelf.signedIn) {
      shelf.promptSignUp("library");
      return;
    }
    if (on) {
      void shelf.set("library", bookId, false);
      return;
    }
    setChoice({ mode: "library" });
    setName("");
    setKind("reading_list");
    setOpen(true);
  }

  async function confirm() {
    setBusy(true);
    const added = await shelf.set("library", bookId, true);
    if (!added) {
      setBusy(false);
      return;
    }
    if (choice.mode === "library") {
      setBusy(false);
      setOpen(false);
      return;
    }
    const target = choice.mode === "existing" ? { collectionId: choice.id } : { name, kind };
    const result = await fileInLibraryAction(bookId, target);
    setBusy(false);
    if (!result.ok) {
      toast(result.message);
      return;
    }
    setOpen(false);
  }

  const canAdd = choice.mode !== "new" || name.trim().length > 0;
  const label = appearance === "icon" ? `Keep ${title} in Library` : on ? "In Library" : "Add to Library";

  return (
    <>
      <button
        type="button"
        aria-pressed={appearance === "icon" ? on : undefined}
        aria-label={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          press();
        }}
        className={cn(
          "press inline-flex items-center justify-center gap-2",
          appearance === "icon"
            ? "size-11 rounded-full border border-border bg-card"
            : cn(
                "min-h-11 rounded-full border px-5 text-sm leading-5 font-medium",
                on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-background",
              ),
        )}
      >
        {appearance === "icon" ? (
          <Swap
            blur
            index={on ? 1 : 0}
            items={[
              <BookmarkPlus key="off" size={20} strokeWidth={1.5} aria-hidden />,
              <BookmarkCheck key="on" size={20} strokeWidth={1.5} className="fill-foreground text-foreground [&>path:last-child]:stroke-card" aria-hidden />,
            ]}
          />
        ) : (
          <Swap
            index={on ? 1 : 0}
            items={[
              <>
                <BookmarkPlus size={16} strokeWidth={1.5} aria-hidden />
                Add to Library
              </>,
              <>
                <BookmarkCheck size={16} strokeWidth={1.5} aria-hidden />
                In Library
              </>,
            ]}
          />
        )}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add to Library"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!canAdd || busy} onClick={() => void confirm()}>Add</Button>
          </>
        }
      >
        <p>This does not use a download. Leave it on Library, or file it in a reading list or collection.</p>
        <fieldset className="mt-4 grid max-h-64 gap-1 overflow-y-auto">
          <legend className="sr-only">Where to keep this book</legend>
          <PlaceOption checked={choice.mode === "library"} onChange={() => setChoice({ mode: "library" })} label="Library" detail="The shelf, with no group" />
          {groups.map((group) => (
            <PlaceOption
              key={group.id}
              checked={choice.mode === "existing" && choice.id === group.id}
              onChange={() => setChoice({ mode: "existing", id: group.id })}
              label={group.name}
              detail={kindLabel(group.kind)}
            />
          ))}
          <PlaceOption checked={choice.mode === "new"} onChange={() => setChoice({ mode: "new" })} label="Create new" detail="A reading list or a collection" />
        </fieldset>
        {choice.mode === "new" ? (
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm leading-5">
              Name
              <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="Summer reading" />
            </label>
            <div className="flex gap-2" role="group" aria-label="Kind">
              {(["reading_list", "collection"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={kind === item}
                  onClick={() => setKind(item)}
                  className={cn(
                    "press min-h-11 rounded-full border px-4 text-sm leading-5",
                    kind === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                  )}
                >
                  {kindLabel(item)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

function PlaceOption({ checked, onChange, label, detail }: { checked: boolean; onChange: () => void; label: string; detail: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-background">
      <input type="radio" name="library-place" checked={checked} onChange={onChange} className="size-4 accent-foreground" />
      <span className="min-w-0">
        <span className="block text-sm leading-5 font-medium">{label}</span>
        <span className="block text-xs leading-4 text-muted-foreground">{detail}</span>
      </span>
    </label>
  );
}
