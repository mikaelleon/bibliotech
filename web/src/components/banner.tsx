import type { ReactNode } from "react";

/** Notice: surface fill, line border, 12px radius, 16px padding. */
export function Banner({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm leading-5">
      <span className="mt-0.5 shrink-0 text-foreground">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
