import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DefinitionList({
  items,
  className,
}: {
  items: { term: string; value: ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm leading-5", className)}>
      {items.map((item) => (
        <div key={item.term} className="contents">
          <dt className="text-muted-foreground">{item.term}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
