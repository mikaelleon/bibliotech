"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { Dialog } from "@/components/dialog";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { setFavoriteAction, setLibraryAction } from "@/lib/actions";
import type { Membership } from "@/lib/collection";
import { openCollectionPicker } from "@/lib/collection-picker";

export type Shelf = "favorites" | "library";

type SetOptions = { silent?: boolean; at?: number; addedAt?: string; memberships?: Membership[]; local?: boolean };

type ShelfValue = {
  /** Registered reader. Guests see the buttons, and pressing one opens the sign-up prompt. */
  signedIn: boolean;
  /** Signed-in account. Offline files are stored under this id. */
  userId: string | null;
  has: (shelf: Shelf, bookId: string) => boolean;
  count: (shelf: Shelf) => number;
  set: (shelf: Shelf, bookId: string, on: boolean, options?: SetOptions) => Promise<boolean>;
  promptSignUp: (shelf: Shelf) => void;
};

const ShelfContext = createContext<ShelfValue | null>(null);

const copy = {
  favorites: { added: "Added to favorites", removed: "Removed from favorites", failed: "Couldn't update favorites. Try again." },
  library: { added: "Added to Library", removed: "Removed from Library", failed: "Couldn't update your Library. Try again." },
} as const;

const prompt = {
  favorites: {
    title: "Create a free account to keep favorites",
    body: "Favorites keeps the books you mark with a heart. An account also raises your download limit from 5 to 10.",
  },
  library: {
    title: "Create a free account to keep a Library",
    body: "Library keeps the books you want to come back to. Adding a book doesn't use a download.",
  },
} as const;

/**
 * One source of truth for the reader's Favorites and Library on this page.
 *
 * Every heart and Library button reads from here, so the same book shown three times on Browse
 * stays in step. Changes are optimistic and call idempotent server actions (set, not toggle), so a
 * stale button or an Undo can't flip the state the wrong way. Failures roll back with a toast.
 */
export function ShelfProvider({
  signedIn,
  userId,
  favoriteIds,
  libraryIds,
  libraryAddedAt,
  children,
}: {
  signedIn: boolean;
  userId: string | null;
  favoriteIds: string[];
  libraryIds: string[];
  libraryAddedAt: Record<string, string>;
  children: ReactNode;
}) {
  const { toast } = useToast();
  const [favorites, setFavorites] = useState(favoriteIds);
  const [library, setLibrary] = useState(libraryIds);
  const [pending, setPending] = useState(0);
  const [asking, setAsking] = useState<Shelf | null>(null);
  // What the prompt last showed. It stays while the dialog plays its exit, so the box doesn't empty out.
  const [shown, setShown] = useState<Shelf>("favorites");
  if (asking && asking !== shown) setShown(asking);
  const [dates, setDates] = useState(libraryAddedAt);

  // Adopt fresh server state after a revalidation, unless a change of ours is still in flight.
  const serverKey = `${favoriteIds.join(",")}|${libraryIds.join(",")}`;
  const [seenKey, setSeenKey] = useState(serverKey);
  if (serverKey !== seenKey && pending === 0) {
    setSeenKey(serverKey);
    setFavorites(favoriteIds);
    setLibrary(libraryIds);
    setDates(libraryAddedAt);
  }

  const has = useCallback(
    (shelf: Shelf, bookId: string) => (shelf === "favorites" ? favorites : library).includes(bookId),
    [favorites, library],
  );

  const count = useCallback((shelf: Shelf) => (shelf === "favorites" ? favorites : library).length, [favorites, library]);

  // A plain function (not useCallback): Undo calls `set` again, and a memoized callback can't
  // refer to itself. Consumers re-render on every shelf change anyway.
  async function set(shelf: Shelf, bookId: string, on: boolean, options: SetOptions = {}): Promise<boolean> {
    const update = shelf === "favorites" ? setFavorites : setLibrary;
    const list = shelf === "favorites" ? favorites : library;
    const position = list.indexOf(bookId);
    if (on === position >= 0) return true;
    const restoreAt = options.at;
    // Removing remembers the date so Undo can put the book back where it was in "Recently added".
    // A fresh add (not an Undo) gets today's date.
    const keepDate = shelf === "library" ? (on ? options.addedAt : dates[bookId]) : undefined;

    // Favorites keep their order (Undo puts one back where it was); Library is newest first.
    update((current) => {
      if (!on) return current.filter((id) => id !== bookId);
      if (current.includes(bookId)) return current;
      if (shelf === "favorites" && restoreAt !== undefined) {
        const next = [...current];
        next.splice(Math.min(restoreAt, next.length), 0, bookId);
        return next;
      }
      return shelf === "library" ? [bookId, ...current] : [...current, bookId];
    });
    if (options.local) return true;
    setPending((value) => value + 1);

    const result =
      shelf === "favorites"
        ? await setFavoriteAction(bookId, on, restoreAt)
        : await setLibraryAction(bookId, on, on ? keepDate : undefined, on ? options.memberships : undefined);
    setPending((value) => value - 1);

    if (!result.ok) {
      update((current) => {
        if (on) return current.filter((id) => id !== bookId);
        const next = current.filter((id) => id !== bookId);
        next.splice(Math.min(position, next.length), 0, bookId);
        return next;
      });
      toast(copy[shelf].failed);
      return false;
    }

    if (shelf === "library" && on) {
      setDates((current) => ({ ...current, [bookId]: keepDate ?? new Date().toISOString() }));
    }

    if (!options.silent) {
      if (shelf === "library" && on) {
        let first = false;
        try {
          first = sessionStorage.getItem("elib.told-library") !== "1";
          if (first) sessionStorage.setItem("elib.told-library", "1");
        } catch {
          first = false;
        }
        toast(first ? "Added to Library. Adding doesn't use a download." : "Added to Library", {
          label: "Add to collection",
          onClick: () => openCollectionPicker([bookId]),
        });
      } else if (shelf === "library") {
        const saved = result.memberships ?? [];
        const groups = new Set(saved.map((row) => row.collectionId)).size;
        const message =
          groups === 0
            ? copy.library.removed
            : `Removed from Library and ${groups === 1 ? "1 collection" : `${groups} collections`}`;
        toast(message, {
          label: "Undo",
          onClick: () => {
            void latest.current?.(shelf, bookId, true, { silent: true, addedAt: keepDate, memberships: saved });
          },
        });
      } else {
        toast(on ? copy[shelf].added : copy[shelf].removed, {
          label: "Undo",
          onClick: () => {
            // The latest `set`, not this render's: this one still sees the shelf from before the change.
            void latest.current?.(shelf, bookId, !on, { silent: true, at: on ? undefined : position, addedAt: keepDate });
          },
        });
      }
    }
    return true;
  }

  const latest = useRef<typeof set | null>(null);
  useEffect(() => {
    latest.current = set;
  });

  const value: ShelfValue = { signedIn, userId, has, count, set, promptSignUp: setAsking };

  return (
    <ShelfContext.Provider value={value}>
      {children}
      <Dialog
        open={asking !== null}
        onOpenChange={(open) => {
          if (!open) setAsking(null);
        }}
        title={prompt[shown].title}
        footer={
          <>
            <Button asChild variant="outline">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </>
        }
      >
        {prompt[shown].body}
      </Dialog>
    </ShelfContext.Provider>
  );
}

export function useShelf(): ShelfValue {
  const value = useContext(ShelfContext);
  if (!value) throw new Error("useShelf must be used inside ShelfProvider (the app shell).");
  return value;
}
