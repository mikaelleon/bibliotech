"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/downloads", label: "Downloads" },
];

function isCurrent(href: string, path: string): boolean {
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

/** Underline tabs for the admin sections. */
export function SectionTabs() {
  const path = usePathname();

  return (
    <div className="-mx-4 mt-6 overflow-x-auto md:mx-0">
      <div role="tablist" aria-label="Admin sections" className="flex min-w-max gap-6 px-4 md:px-0">
        {tabs.map((tab) => {
          const current = isCurrent(tab.href, path);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={current}
              className={cn(
                "inline-flex h-11 items-center border-b-2 text-sm leading-5 font-medium no-underline",
                current ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
