import * as React from "react";

import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 rounded-xl border border-border bg-card px-3 text-sm leading-5 text-foreground",
        className,
      )}
      {...props}
    />
  );
}
