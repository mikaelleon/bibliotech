"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { logoutAction } from "@/lib/actions";
import { clearAppCache } from "@/lib/device-cache";
import { removeAllSaved } from "@/lib/offline-books";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({ session, upgrade = true }: { session: Session; upgrade?: boolean }) {
  if (session.kind !== "user") {
    return (
      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <Button asChild variant="outline" className="hidden md:inline-flex">
          <Link href="/login">Log in</Link>
        </Button>
        {upgrade ? (
          <Button asChild variant="outline" className="px-4 md:px-6">
            <Link href="/register">Register</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <Link
        href={session.role === "admin" ? "/admin/account" : "/profile"}
        aria-label={`${session.name} account`}
        className="md:hidden"
      >
        <Avatar name={session.name} />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="hidden min-h-11 items-center gap-2 text-sm leading-5 font-medium md:inline-flex"
          aria-label={`Account menu for ${session.name}`}
        >
          <Avatar name={session.name} />
          {session.name}
          <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {session.role === "admin" ? (
            <DropdownMenuItem asChild>
              <Link href="/admin/account">Account settings</Link>
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/library">Library</Link>
              </DropdownMenuItem>
            </>
          )}
          <LogoutItem userId={session.id} />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function LogoutItem({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pending}
      onSelect={() => {
        startTransition(async () => {
          await clearAppCache();
          await removeAllSaved(userId);
          await logoutAction();
        });
      }}
    >
      {pending ? "Logging out" : "Log out"}
    </DropdownMenuItem>
  );
}
