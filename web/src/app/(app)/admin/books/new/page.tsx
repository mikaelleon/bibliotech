import { BookForm } from "@/components/book-form";
import { PageHeader } from "@/components/page-header";
import { SectionTabs } from "@/components/section-tabs";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Add book" };

export default async function NewBookPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-16 px-4 py-6 md:px-8 md:py-8">
      <div>
        <PageHeader title="Add book" lede="The form is ready. Saving stays off until Phase 2." />
        <SectionTabs />
      </div>
      <BookForm />
    </main>
  );
}
