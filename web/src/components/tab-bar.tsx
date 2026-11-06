"use client";

import { BookOpen, Heart, Library, Lock, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  locked: boolean;
};

function isCurrent(href: string, path: string): boolean {
  if (href === "/browse") return path === "/browse" || path.startsWith("/books/");
  return path === href;
}

/** Bottom tabs under 768px. Matches the mobile frames, including the lock on guest tabs. */
export function TabBar({ session }: { session: Session }) {
  const path = usePathname();
  const guest = session.kind !== "user";
  const items: Item[] = [
    { href: "/browse", label: "Browse", icon: BookOpen, locked: false },
    { href: "/library", label: "Library", icon: Library, locked: guest },
    { href: "/favorites", label: "Favorites", icon: Heart, locked: guest },
    { href: "/profile", label: "Profile", icon: User, locked: guest },
  ];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => {
        const current = isCurrent(item.href, path);
        const Icon = item.icon;
        const accessible = item.locked ? `${item.label}, requires an account` : item.label;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={accessible}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs leading-4 text-muted-foreground no-underline",
              current && "text-foreground",
            )}
          >
            <span
              className={cn(
                "relative flex h-8 w-12 items-center justify-center rounded-full text-foreground",
                current && "bg-brand text-white",
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
