"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNav } from "@/components/main-nav";
import { Tooltip } from "@/components/ui/tooltip";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SideRail({ session }: { session: Session }) {
  const path = usePathname();
  const items = mainNav(session, false);

  return (
    <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-2 self-start bg-card py-6 md:flex">
      {items.map((item) => {
        const current = item.current(path);
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
            {item.locked ? <Tooltip label="Requires an account">{link}</Tooltip> : <Tooltip label={item.label}>{link}</Tooltip>}
          </div>
        );
      })}
    </nav>
  );
}
