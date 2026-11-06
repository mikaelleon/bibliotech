import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-base text-foreground outline-none placeholder:text-muted-foreground aria-invalid:border-brand-text",
        className,
      )}
      {...props}
    />
  );
}
