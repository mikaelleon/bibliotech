import { notFound } from "next/navigation";

import { BookForm } from "@/components/book-form";
import { PageHeader } from "@/components/page-header";
import { isAdminSession } from "@/lib/admin";
import { getBook } from "@/lib/books";
import { getSession } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = getBook(id);
  return { title: book ? `Edit ${book.title}` : "Edit book" };
}

export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;
  const { id } = await params;
  const book = getBook(id);
  if (!book) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Edit book" lede={book.title} />
      <BookForm book={book} />
    </main>
  );
}
