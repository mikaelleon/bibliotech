"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

let lastPointer: { x: number; y: number } | null = null;
let tracking = false;

/** Remembers where the last press happened, for triggers that don't keep focus (Safari buttons, menu items). */
function trackPointer() {
  if (tracking || typeof window === "undefined") return;
  tracking = true;
  window.addEventListener(
    "pointerdown",
    (event) => {
      lastPointer = { x: event.clientX, y: event.clientY };
    },
    true,
  );
}

/** Offset from the viewport centre to the trigger, so the dialog grows from it and shrinks back to it. */
function triggerOffset(): { x: number; y: number } | null {
  const active = document.activeElement;
  let point = lastPointer;
  if (active instanceof HTMLElement && active !== document.body) {
    const box = active.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) point = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }
  if (!point) return null;
  return { x: point.x - window.innerWidth / 2, y: point.y - window.innerHeight / 2 };
}

/** Centered dialog. It enters from its trigger and exits back to it. Escape and the scrim close it. Focus returns to the trigger. */
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    trackPointer();
    // Measured before paint, so the first frame of the entrance already uses the trigger as its origin.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setOrigin(triggerOffset());
  }, [open]);

  const style = origin
    ? ({ "--dialog-ox": `${origin.x}px`, "--dialog-oy": `${origin.y}px` } as CSSProperties)
    : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="sheet-overlay fixed inset-0 z-50 bg-[rgba(31,35,48,0.4)]" />
        <DialogPrimitive.Content
          style={style}
          className="dialog-pop fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-8 shadow-[var(--shadow-overlay)] focus:outline-none"
        >
          <DialogPrimitive.Title className="section-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description asChild>
            <div className="mt-2 text-base leading-6 text-foreground">{children}</div>
          </DialogPrimitive.Description>
          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
