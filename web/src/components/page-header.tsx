import type { ReactNode } from "react";

/** Page title, one muted sentence, and at most one action on the right. */
export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {lede ? <p className="mt-2 text-base leading-6 text-muted-foreground">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
