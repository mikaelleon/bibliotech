import { Reader } from "@/components/reader";
import { listCatalog } from "@/lib/catalog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = (await listCatalog()).find((item) => item.id === id);
  return { title: book ? `Read ${book.title}` : "Read" };
}

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = (await listCatalog()).find((item) => item.id === id);
  return <Reader bookId={id} title={book?.title ?? "Book"} />;
}
