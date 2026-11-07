"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { logoutAction } from "@/lib/actions";
import type { Session } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({ session }: { session: Session }) {
  if (session.kind !== "user") {
    return (
      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <Button asChild variant="link" className="hidden text-sm md:inline-flex">
          <Link href="/login">Log in</Link>
        </Button>
        <Button asChild variant="outline" className="px-4 md:px-6">
          <Link href="/register">Register</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/profile"
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
            <p className="px-3 py-2 text-sm leading-5 text-muted-foreground">Admin</p>
          ) : null}
          <LogoutItem />
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function LogoutItem() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pending}
      onSelect={() => {
        startTransition(() => {
          void logoutAction();
        });
      }}
    >
      {pending ? "Logging out" : "Log out"}
    </DropdownMenuItem>
  );
}
