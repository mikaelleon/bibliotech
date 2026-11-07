import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Crossfades between states stacked in one cell, so the box keeps the size of the largest state.
 * Use `blur` for small icons only. Hidden states are removed from the accessibility tree.
 */
export function Swap({
  index,
  items,
  blur = false,
  className,
}: {
  index: number;
  items: ReactNode[];
  blur?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("swap", blur && "swap-blur", className)}>
      {items.map((item, position) => (
        <span key={position} data-shown={position === index} aria-hidden={position === index ? undefined : true}>
          {item}
        </span>
      ))}
    </span>
  );
}
