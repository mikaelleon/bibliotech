"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNav } from "@/components/main-nav";
import type { Session } from "@/lib/types";
import { useIndicator } from "@/lib/use-indicator";
import { cn } from "@/lib/utils";

/** Bottom tabs under 768px. Administrators get the same four operator destinations as the desktop rail. */
export function TabBar({ session }: { session: Session }) {
  const path = usePathname();
  const items = mainNav(session, true);
  const active = items.find((item) => item.current(path))?.href;
  const { containerRef, indicatorRef } = useIndicator<HTMLElement>(active);

  return (
    <nav
      ref={containerRef}
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 isolate flex bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <span ref={indicatorRef} aria-hidden className="nav-indicator -z-10 rounded-full bg-brand opacity-0" />
      {items.map((item) => {
        const current = item.current(path);
        const Icon = item.icon;
        const accessible = item.locked ? `${item.label}, requires an account` : item.label;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={accessible}
            aria-current={current ? "page" : undefined}
            className={cn(
              "press flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs leading-4 text-muted-foreground no-underline",
              current && "text-foreground",
            )}
          >
            <span
              data-indicator-target={current}
              className={cn(
                "relative flex h-8 w-12 items-center justify-center rounded-full",
                current ? "text-white" : "text-foreground",
              )}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              {item.locked ? (
                <Lock
                  size={12}
                  strokeWidth={1.5}
                  aria-hidden
                  className={cn("absolute top-0 right-1", current ? "text-white" : "text-muted-foreground")}
                />
              ) : null}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
