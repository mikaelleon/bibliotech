"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as React from "react";

import { cn } from "@/lib/utils";

export function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root {...props} />;
}

export function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
  return <DropdownMenuPrimitive.Trigger {...props} />;
}

export function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align="end"
        sideOffset={8}
        className={cn(
          "z-50 min-w-40 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-overlay)]",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm leading-5 outline-none data-[highlighted]:bg-background",
        className,
      )}
      {...props}
    />
  );
}
