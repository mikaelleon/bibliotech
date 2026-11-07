"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Sheet(props: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root {...props} />;
}

export function SheetTrigger(props: React.ComponentProps<typeof Dialog.Trigger>) {
  return <Dialog.Trigger {...props} />;
}

export function SheetClose(props: React.ComponentProps<typeof Dialog.Close>) {
  return <Dialog.Close {...props} />;
}

export function SheetTitle(props: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title {...props} />;
}

const panel = cva(
  "fixed z-50 flex flex-col bg-card shadow-[var(--shadow-overlay)] focus:outline-none",
  {
    variants: {
      side: {
        right: "sheet-right inset-y-0 right-0 h-full w-96 max-w-full",
        bottom: "sheet-bottom inset-x-0 bottom-0 h-[560px] max-h-[92vh] rounded-t-xl",
      },
    },
    defaultVariants: { side: "right" },
  },
);

export function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Content> & VariantProps<typeof panel>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay fixed inset-0 z-50 bg-[rgba(31,35,48,0.3)]" />
      <Dialog.Content className={cn(panel({ side }), className)} {...props}>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
