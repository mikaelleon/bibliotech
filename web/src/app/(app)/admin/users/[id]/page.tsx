import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { UserEditor } from "@/components/user-editor";
import { adminGetUser, isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "User" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  const { id } = await params;
  const userId = decodeURIComponent(id);
  if (!uuidPattern.test(userId)) notFound();
  const user = await adminGetUser(session, userId);
  if (!user) notFound();

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={user.name} lede={user.email} />
      <UserEditor
        name={user.name}
        email={user.email}
        role={user.role}
        tier={user.tier}
        verifiedAt={user.verifiedAt}
        downloadsUsed={user.downloadsUsed}
        downloadLimit={user.downloadLimit}
        resetsAt={user.resetsAt}
        favorites={user.favorites}
        libraryItems={user.libraryItems}
        self={session.id === user.id}
        lastAdmin={user.role === "admin" && user.adminCount <= 1}
      />
    </main>
  );
}
