import { AccountPanel } from "@/components/account-panel";
import { PageHeader } from "@/components/page-header";
import { SecurityPanel } from "@/components/security-panel";
import { LogoutButton } from "@/components/logout-button";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export const metadata = { title: "Account settings" };

export default async function AdminAccountPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Account settings" />
      <div className="mt-6 grid max-w-xl gap-6">
        <AccountPanel name={session.name} email={session.email} />
        <SecurityPanel />
        <LogoutButton userId={session.id} />
      </div>
    </main>
  );
}
