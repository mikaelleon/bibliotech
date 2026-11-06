"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={400}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="right"
          sideOffset={8}
          className={cn(
            "z-50 rounded-sm border border-border bg-card px-2 py-1 text-xs leading-4 text-foreground shadow-[var(--shadow-overlay)]",
          )}
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
