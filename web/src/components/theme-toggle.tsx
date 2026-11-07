"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  localStorage.setItem("elib-theme", theme);
  listeners.forEach((listener) => listener());
}

/** Light and dark. The choice is stored on this browser. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  const dark = theme === "dark";

  if (compact) {
    return (
      <button
        type="button"
        aria-pressed={dark}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={() => applyTheme(dark ? "light" : "dark")}
        className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-background"
      >
        {dark ? <Sun size={20} strokeWidth={1.5} aria-hidden /> : <Moon size={20} strokeWidth={1.5} aria-hidden />}
      </button>
    );
  }

  return (
    <div className="inline-flex rounded-full border border-border p-1" role="group" aria-label="Theme">
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => applyTheme(option)}
          className={cn(
            "h-9 rounded-full px-4 text-sm leading-5 capitalize",
            theme === option ? "bg-foreground text-background" : "text-muted-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
