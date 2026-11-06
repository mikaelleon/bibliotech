"use client";

import { BookOpen, Heart, Library, Lock, Shield, User, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Tooltip } from "@/components/ui/tooltip";
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

export function SideRail({ session }: { session: Session }) {
  const path = usePathname();
  const guest = session.kind !== "user";
  const items: Item[] = [
    { href: "/browse", label: "Browse", icon: BookOpen, locked: false },
    { href: "/library", label: "My Library", icon: Library, locked: guest },
    { href: "/favorites", label: "Favorites", icon: Heart, locked: guest },
    { href: "/profile", label: "Profile", icon: User, locked: guest },
  ];

  if (session.kind === "user" && session.role === "admin") {
    items.push({ href: "/admin", label: "Admin", icon: Shield, locked: false });
  }

  return (
    <nav aria-label="Main" className="hidden w-20 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-6 md:flex">
      {items.map((item) => {
        const current = isCurrent(item.href, path);
        const Icon = item.icon;
        const label = item.locked ? `${item.label} (requires an account)` : item.label;
        const link = (
          <Link
            href={item.href}
            aria-label={label}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative flex size-11 items-center justify-center rounded-full text-foreground hover:bg-background",
              current && "bg-brand text-white hover:bg-brand",
            )}
          >
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            {item.locked ? (
              <Lock
                size={12}
                strokeWidth={1.5}
                aria-hidden
                className={cn("absolute top-0 right-0", current ? "text-white" : "text-muted-foreground")}
              />
            ) : null}
          </Link>
        );

        return (
          <div key={item.href}>
            {item.locked ? <Tooltip label="Requires an account">{link}</Tooltip> : link}
          </div>
        );
      })}
    </nav>
  );
}
