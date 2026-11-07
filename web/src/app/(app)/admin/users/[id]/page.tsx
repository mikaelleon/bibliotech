import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { UserEditor } from "@/components/user-editor";
import { isAdminSession } from "@/lib/admin";
import { listFavoriteIds, listLibrary } from "@/lib/records";
import { getSession } from "@/lib/session";
import { listUsers } from "@/lib/users";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: decodeURIComponent(id) };
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const { id } = await params;
  const email = decodeURIComponent(id).trim().toLowerCase();
  const users = await listUsers();
  const user = users.find((item) => item.email === email);
  if (!user) notFound();

  const favorites = await listFavoriteIds(user.email);
  const library = await listLibrary(user.email);
  const adminCount = users.filter((item) => item.role === "admin").length;

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={user.name} lede={user.email} />
      <UserEditor
        name={user.name}
        email={user.email}
        role={user.role}
        downloadsUsed={user.downloadsUsed}
        favorites={favorites.length}
        libraryItems={library.length}
        self={session.email === user.email}
        lastAdmin={user.role === "admin" && adminCount <= 1}
      />
    </main>
  );
}
