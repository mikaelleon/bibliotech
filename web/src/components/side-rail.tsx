"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { mainNav } from "@/components/main-nav";
import { Tooltip } from "@/components/ui/tooltip";
import type { Session } from "@/lib/types";
import { useIndicator } from "@/lib/use-indicator";
import { usePendingNav } from "@/lib/use-pending-nav";
import { cn } from "@/lib/utils";

export function SideRail({ session }: { session: Session }) {
  const items = mainNav(session, false);
  const { active, isCurrent, onNavigate } = usePendingNav(items);
  const { containerRef, indicatorRef } = useIndicator<HTMLElement>(active);

  return (
    <nav ref={containerRef} aria-label="Main" className="sticky top-0 isolate hidden h-dvh w-20 shrink-0 flex-col items-center gap-1 self-start bg-card py-6 md:flex">
      <span ref={indicatorRef} aria-hidden className="nav-indicator -z-10 rounded-full bg-brand opacity-0" />
      {items.map((item) => {
        const current = isCurrent(item);
        const Icon = item.icon;
        const label = item.locked ? `${item.label} (requires an account)` : item.label;
        const link = (
          <Link
            href={item.href}
            prefetch
            onClick={onNavigate(item)}
            aria-label={label}
            aria-current={current ? "page" : undefined}
            className={cn(
              "press group flex w-full flex-col items-center gap-1 py-1 text-xs leading-4 no-underline",
              current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              data-indicator-target={current}
              className={cn(
                "relative flex h-8 w-12 items-center justify-center rounded-full transition-colors duration-[var(--dur-hover)]",
                current ? "text-white" : "text-foreground group-hover:bg-background",
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

        return (
          <div key={item.href} className="w-full">
            {item.locked ? <Tooltip label="Requires an account">{link}</Tooltip> : link}
          </div>
        );
      })}
    </nav>
  );
}
