"use client";

import { AddToLibrary } from "@/components/add-to-library";

/** Bookmark on a cover. Adding opens the Library dialog. A book already kept is removed. */
export function LibraryButton({ bookId, title }: { bookId: string; title: string }) {
  return <AddToLibrary bookId={bookId} title={title} appearance="icon" />;
}
