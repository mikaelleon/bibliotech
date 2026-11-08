"use client";

import { useEffect, useState } from "react";

import { useShelf } from "@/components/shelf-provider";
import { savedBook } from "@/lib/offline-books";

/** Quiet line under a library card when the file is on this browser. */
export function OnDeviceNote({ bookId }: { bookId: string }) {
  const { userId } = useShelf();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    void savedBook(userId, bookId).then((row) => {
      if (live) setOn(Boolean(row));
    });
    return () => {
      live = false;
    };
  }, [bookId, userId]);
  if (!on) return null;
  return <p className="text-xs leading-4 text-muted-foreground">On this device</p>;
}
