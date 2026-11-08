"use client";

import { useEffect } from "react";

import { flushProgress } from "@/lib/offline-books";

/** Sends this account's queued reading positions when the browser is online. */
export function ProgressFlush({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return;
    const flush = () => void flushProgress(userId);
    window.addEventListener("online", flush);
    flush();
    return () => window.removeEventListener("online", flush);
  }, [userId]);
  return null;
}
