"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { toggleFavoriteAction } from "@/lib/actions";
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
  const label = on ? "Remove from favorites" : "Add to favorites";

  async function press() {
    if (pending) return;
    const next = !on;
    setOn(next);
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
        "inline-flex size-11 items-center justify-center rounded-full",
        overlay ? "border border-border bg-card" : "border border-border bg-card",
      )}
    >
      <Heart size={20} strokeWidth={1.5} className={on ? "fill-foreground text-foreground" : "text-foreground"} aria-hidden />
    </button>
  );
}
