import { AccountPanel } from "@/components/account-panel";
import { PageHeader } from "@/components/page-header";
import { SecurityPanel } from "@/components/security-panel";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { LogOut } from "lucide-react";

export const metadata = { title: "Account settings" };

export default async function AdminAccountPage() {
  const session = await getSession();
  if (!isAdminSession(session)) return null;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Account settings" lede="Your operator account. Reader profiles stay on reader accounts." />
      <div className="mt-6 grid max-w-xl gap-6">
        <AccountPanel name={session.name} email={session.email} />
        <SecurityPanel />
        <section className="rounded-xl bg-card p-8" aria-labelledby="session-heading">
          <h2 id="session-heading" className="text-xl leading-7 font-medium">
            Session
          </h2>
          <form action={logoutAction} className="mt-4">
            <Button type="submit" variant="outline">
              <LogOut strokeWidth={1.5} />
              Log out
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
