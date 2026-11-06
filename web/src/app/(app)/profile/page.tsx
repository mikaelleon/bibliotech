import { LogOut } from "lucide-react";

import { AccountPanel } from "@/components/account-panel";
import { LockedPanel } from "@/components/locked-panel";
import { PageHeader } from "@/components/page-header";
import { SecurityPanel } from "@/components/security-panel";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions";
import { getSession } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getSession();
  if (session.kind !== "user") return <LockedPanel title="Profile" />;

  const used = session.downloadsUsed;
  const width = `${Math.max(0, Math.min(100, (used / 10) * 100))}%`;

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Profile" lede="Your account, downloads, and session." />
      <div className="mt-6 grid max-w-xl gap-6">
        <AccountPanel name={session.name} email={session.email} />
        <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="downloads-heading">
          <h2 id="downloads-heading" className="text-xl leading-7 font-medium">
            Downloads
          </h2>
          <p className="mt-4 text-sm leading-5">{used} of 10 downloads used</p>
          <div className="mt-3 h-1 w-32 overflow-hidden rounded-full bg-border" aria-hidden>
            <i className="block h-full bg-brand" style={{ width }} />
          </div>
          <p className="mt-3 text-sm leading-5 text-muted-foreground">Registered accounts include 10 downloads.</p>
        </section>
        <SecurityPanel />
        <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="session-heading">
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
