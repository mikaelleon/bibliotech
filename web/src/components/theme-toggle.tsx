"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";

import { Swap } from "@/components/swap";
import { durMove, durReveal, easeInOut, prefersReducedMotion } from "@/lib/motion";
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
  try {
    localStorage.setItem("elib-theme", theme);
  } catch {
    // Storage can be blocked. The theme still applies for this page.
  }
  listeners.forEach((listener) => listener());
}

/** Reveals the new theme with a circle that grows from the control the reader clicked. */
function switchTheme(theme: Theme, event: MouseEvent<HTMLElement>) {
  if (theme === currentTheme()) return;
  if (!("startViewTransition" in document) || prefersReducedMotion()) {
    applyTheme(theme);
    return;
  }

  const box = event.currentTarget.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;

  // Named elements (the book detail cover) would get their own crossfade on top of the circle.
  // Unname them for this transition so the whole page is revealed together.
  const named = Array.from(document.querySelectorAll<HTMLElement>("[style*='view-transition-name']")).filter(
    (element) => element.style.viewTransitionName && element.style.viewTransitionName !== "none",
  );
  const names = named.map((element) => element.style.viewTransitionName);
  named.forEach((element) => {
    element.style.viewTransitionName = "none";
  });

  root.classList.add("theme-reveal");
  const transition = document.startViewTransition(() => applyTheme(theme));
  void transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: durReveal, easing: easeInOut, pseudoElement: "::view-transition-new(root)" },
    );
  });
  void transition.finished.finally(() => {
    root.classList.remove("theme-reveal");
    named.forEach((element, index) => {
      element.style.viewTransitionName = names[index];
    });
  });
}

/** Light and dark. The choice is stored on this browser. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as Theme);
  const dark = theme === "dark";
  // Hydration can flip the theme right after mount (the server renders light). That jump must not slide.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setArmed(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  if (compact) {
    return (
      <button
        type="button"
        aria-pressed={dark}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
        onClick={(event) => switchTheme(dark ? "light" : "dark", event)}
        className="press inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-background"
      >
        <Swap
          blur
          index={dark ? 1 : 0}
          items={[
            <Moon key="moon" size={20} strokeWidth={1.5} aria-hidden />,
            <Sun key="sun" size={20} strokeWidth={1.5} aria-hidden />,
          ]}
        />
      </button>
    );
  }

  return (
    <div
      className="relative isolate inline-grid grid-cols-2 rounded-full border border-border p-1"
      role="group"
      aria-label="Theme"
    >
      {/* The thumb. Both columns are equal, so it slides exactly one column. Driven by state alone, so a click
          mid-slide turns it around from where it is. */}
      <span
        aria-hidden
        style={{
          transform: dark ? "translateX(100%)" : "translateX(0)",
          transition: armed ? `transform ${durMove}ms ${easeInOut}` : "none",
        }}
        className="absolute top-1 bottom-1 left-1 -z-10 w-[calc(50%-4px)] rounded-full bg-foreground motion-reduce:!transition-none"
      />
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={(event) => switchTheme(option, event)}
          className={cn(
            "press h-9 rounded-full px-4 text-sm leading-5 capitalize transition-colors duration-150",
            theme === option ? "text-background" : "text-muted-foreground",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
