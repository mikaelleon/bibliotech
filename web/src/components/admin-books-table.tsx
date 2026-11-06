"use client";

import { MoreHorizontal } from "lucide-react";
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

function RowMenu({ book, onDelete }: { book: Book; onDelete: (book: Book) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${book.title}`}
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-background"
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal size={20} strokeWidth={1.5} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href={`/admin/books/${book.id}/edit`}>Edit</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onDelete(book);
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminBooksTable({ books }: { books: Book[] }) {
  const [pending, setPending] = useState<Book | null>(null);
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
          <span className="block text-sm leading-5 font-medium">{book.title}</span>
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
      cell: (book) => <RowMenu book={book} onDelete={setPending} />,
    },
  ];

  return (
    <>
      <DataTable columns={columns} rows={books} empty="No books match that search." caption="Books" hrefFor={(book) => `/books/${book.id}`} />
      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title="Delete this book?"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button type="button" disabled>
              Delete
            </Button>
          </>
        }
      >
        {pending ? `${pending.title} will be removed. This can't be undone.` : null}
        <span className="mt-2 block text-sm leading-5 text-muted-foreground">Deleting arrives in Phase 2.</span>
      </Dialog>
    </>
  );
}
