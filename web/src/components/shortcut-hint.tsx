"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

function subscribe() {
  return () => undefined;
}

function shortcutLabel() {
  const platform = navigator.platform || "";
  return /Mac|iPhone|iPad|iPod/.test(platform) ? "⌘K" : "Ctrl K";
}

/** Shows ⌘K on Apple keyboards and Ctrl K everywhere else. */
export function ShortcutHint({ large = false }: { large?: boolean }) {
  const label = useSyncExternalStore(subscribe, shortcutLabel, () => "Ctrl K");

  return (
    <kbd
      className={cn(
        "absolute right-4 rounded-sm border border-border px-2 py-0.5 text-xs leading-4 text-muted-foreground",
        large ? "top-4" : "top-2.5",
      )}
    >
      {label}
    </kbd>
  );
}
