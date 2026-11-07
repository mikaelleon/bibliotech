"use client";

import type { ReactNode } from "react";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BookCover } from "@/components/book-cover";
import { DataTable, type DataColumn } from "@/components/data-table";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Book } from "@/lib/types";

export function AdminBooksTable({ books, empty = "No books yet" }: { books: Book[]; empty?: ReactNode }) {
  const columns: DataColumn<Book>[] = [
    {
      key: "cover",
      header: "Cover",
      cell: (book) => (
        <div className="w-10">
          <BookCover book={book} decorative className="w-10" />
        </div>
      ),
      stack: () => null,
    },
    {
      key: "title",
      header: "Title",
      cell: (book) => (
        <span className="block">
          <Link href={`/admin/books/${book.id}/edit`} className="block text-sm leading-5 font-medium text-foreground no-underline">
            {book.title}
          </Link>
          <span className="block text-sm leading-5 text-muted-foreground">{book.author}</span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (book) => book.category,
    },
    {
      key: "source",
      header: "Source and license",
      cell: (book) => (
        <span>
          {book.sourceName}
          <span className="text-muted-foreground"> · {book.license}</span>
        </span>
      ),
    },
    {
      key: "added",
      header: "Added",
      cell: () => <span className="text-muted-foreground">Not recorded</span>,
    },
    {
      key: "menu",
      header: "Actions",
      cell: (book) => <BookRowMenu book={book} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={books}
      empty={empty}
      caption="Books"
      hrefFor={(book) => `/admin/books/${book.id}/edit`}
    />
  );
}

function BookRowMenu({ book }: { book: Book }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${book.title}`}
          className="press inline-flex size-11 items-center justify-center rounded-full hover:bg-background"
        >
          <Ellipsis size={20} strokeWidth={1.5} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link href={`/admin/books/${book.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              window.setTimeout(() => setOpen(true), 0);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${book.title}?`}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled>
              Delete
            </Button>
          </>
        }
      >
        <p>This removes {book.title} from the catalog.</p>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">Arrives in Phase 2.</p>
      </Dialog>
    </>
  );
}
