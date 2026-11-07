"use client";

import { Heart } from "lucide-react";
import { useRef, useState } from "react";

import { Swap } from "@/components/swap";
import { useToast } from "@/components/toast";
import { toggleFavoriteAction } from "@/lib/actions";
import { durConfirm, easeOut, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Heart control. Filled ink when the book is a favorite. */
export function FavoriteButton({
  bookId,
  active,
  overlay = false,
  onChange,
}: {
  bookId: string;
  active: boolean;
  overlay?: boolean;
  onChange?: (active: boolean) => void;
}) {
  const { toast } = useToast();
  const [on, setOn] = useState(active);
  const [pending, setPending] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const label = on ? "Remove from favorites" : "Add to favorites";

  async function press() {
    if (pending) return;
    const next = !on;
    setOn(next);
    if (next) confirm();
    setPending(true);
    onChange?.(next);
    const result = await toggleFavoriteAction(bookId);
    setPending(false);
    if (!result.ok) {
      setOn(!next);
      onChange?.(!next);
      toast("Couldn't update favorites. Try again.");
      return;
    }
    setOn(result.active);
    if (!onChange) {
      toast(result.active ? "Saved to favorites." : "Removed from favorites.", {
        label: "Undo",
        onClick: () => {
          void toggleFavoriteAction(bookId);
          setOn(!result.active);
        },
      });
    }
  }

  /** One-shot confirmation when a book becomes a favorite. Never on removal or failure. */
  function confirm() {
    if (prefersReducedMotion()) return;
    iconRef.current?.animate([{ scale: 1 }, { scale: 1.15 }, { scale: 1 }], { duration: durConfirm, easing: easeOut });
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void press();
      }}
      className={cn(
        "press inline-flex size-11 items-center justify-center rounded-full",
        overlay ? "border border-border bg-card" : "border border-border bg-card",
      )}
    >
      <span ref={iconRef} className="inline-flex">
        <Swap
          blur
          index={on ? 1 : 0}
          items={[
            <Heart key="off" size={20} strokeWidth={1.5} className="text-foreground" aria-hidden />,
            <Heart key="on" size={20} strokeWidth={1.5} className="fill-foreground text-foreground" aria-hidden />,
          ]}
        />
      </span>
    </button>
  );
}
