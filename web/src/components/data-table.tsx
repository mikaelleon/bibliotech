"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";

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
  /** Shown as one full-width row, so the header and pagination stay where they are. */
  empty: ReactNode;
  hrefFor?: (row: T) => string;
  caption: string;
}) {
  // Rows stagger in on first render only. Paging, sorting, and filtering swap without replaying it.
  const [firstRender, setFirstRender] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setFirstRender(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const titleColumn =
    columns.find((column) => column.key === "title" || column.key === "name") ?? columns[0];
  const metaColumns = columns.filter((column) => column !== titleColumn && column.key !== "menu");
  const menuColumn = columns.find((column) => column.key === "menu");

  return (
    <div className="overflow-hidden rounded-xl bg-card">
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
        <tbody className={firstRender ? "stagger" : undefined}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-sm leading-5 text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <RowLink key={row.id} href={hrefFor?.(row)} className="hover-fill h-16 hover:bg-background">
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
      <ul className={cn("md:hidden", firstRender && "stagger")}>
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-sm leading-5 text-muted-foreground">{empty}</li>
        ) : null}
        {rows.map((row) => (
          <li key={row.id} className="py-2">
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                {titleColumn ? <div className="text-sm leading-5">{titleColumn.cell(row)}</div> : null}
                <p className="text-sm leading-5 text-muted-foreground">
                  {metaColumns.map((column) => {
                    const content = column.stack ? column.stack(row) : column.cell(row);
                    if (content == null || content === false) return null;
                    return <span key={column.key}>{content} </span>;
                  })}
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
