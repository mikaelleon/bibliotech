"use client";

import { Download } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { leftLabel, quotaFor, quotaNote } from "@/lib/quota";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Download allowance in the top bar. The trigger names the unit ("5 downloads left", or "5 left"
 * next to a download icon on phones). Pressing it explains the limit and, for guests, how to raise it.
 */
export function QuotaMeter({ session }: { session: Session }) {
  const quota = quotaFor(session);
  if (!quota) return null;

  const label = leftLabel(quota.left);
  const percent = `${(quota.used / quota.limit) * 100}%`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${quota.left} of ${quota.limit} downloads left. Show details`}
        className={cn(
          "press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm leading-5 hover:bg-background data-[state=open]:bg-background",
          quota.low ? "text-brand-text" : "text-muted-foreground",
        )}
      >
        <Download size={16} strokeWidth={1.5} aria-hidden />
        <span className="md:hidden">{quota.left === 0 ? "None left" : `${quota.left} left`}</span>
        <span className="hidden md:inline">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72 p-4">
        <p className="text-sm leading-5 font-medium text-foreground">
          {quota.guest ? `Guests can download ${quota.limit} books` : `${quota.used} of ${quota.limit} downloads used`}
        </p>
        <div
          className="mt-3 h-1 overflow-hidden rounded-full bg-border"
          role="meter"
          aria-label="Downloads used"
          aria-valuemin={0}
          aria-valuemax={quota.limit}
          aria-valuenow={quota.used}
        >
          <i className="bar-grow block h-full bg-brand" style={{ width: percent }} />
        </div>
        <p className="mt-3 text-sm leading-5 text-muted-foreground">
          {quota.guest ? "A free account keeps a library and favorites." : quotaNote(quota)}
        </p>
        <p className="mt-2 text-xs leading-4 text-muted-foreground">Downloading opens in a later update.</p>
        {quota.guest ? (
          // Menu items, so arrow keys reach them. Plain links inside a menu can't be tabbed to.
          <div className="-mx-2 mt-3 grid">
            <DropdownMenuItem asChild className="font-medium text-foreground">
              <Link href="/register">Create a free account</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-muted-foreground">
              <Link href="/login">Log in</Link>
            </DropdownMenuItem>
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
