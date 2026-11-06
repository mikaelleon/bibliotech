"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
  /** Second line used when the table stacks on a narrow screen. */
  stack?: (row: T) => ReactNode;
};

function RowLink({ href, className, children }: { href?: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  if (!href) return <tr className={className}>{children}</tr>;

  function open() {
    router.push(href!);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === "Enter") open();
  }

  return (
    <tr
      tabIndex={0}
      className={cn(className, "cursor-pointer")}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      {children}
    </tr>
  );
}

/** Bordered table from 768px up. Stacked rows below that. */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  empty,
  hrefFor,
  caption,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  empty: string;
  hrefFor?: (row: T) => string;
  caption: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-8 text-sm leading-5 text-muted-foreground">
        {empty}
      </div>
    );
  }

  const titleColumn = columns[0];
  const metaColumns = columns.slice(1).filter((column) => column.key !== "menu");
  const menuColumn = columns.find((column) => column.key === "menu");

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="hidden w-full border-collapse md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-sm leading-5 text-muted-foreground">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("px-4 py-3 font-normal", column.align === "right" && "text-right")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <RowLink key={row.id} href={hrefFor?.(row)} className="h-16 border-t border-border hover:bg-background">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn("px-4 align-middle", column.align === "right" && "text-right")}
                  onClick={column.key === "menu" ? (event) => event.stopPropagation() : undefined}
                  onKeyDown={column.key === "menu" ? (event) => event.stopPropagation() : undefined}
                >
                  {column.cell(row)}
                </td>
              ))}
            </RowLink>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="border-t border-border first:border-t-0">
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                {titleColumn ? <div className="text-sm leading-5">{titleColumn.cell(row)}</div> : null}
                <p className="text-sm leading-5 text-muted-foreground">
                  {metaColumns.map((column) => (
                    <span key={column.key}>{column.stack ? column.stack(row) : column.cell(row)} </span>
                  ))}
                </p>
              </div>
              {menuColumn ? <div>{menuColumn.cell(row)}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
