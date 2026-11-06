import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { DefinitionList } from "@/components/definition-list";
import { LockedPanel } from "@/components/locked-panel";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions";
import { getSession } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getSession();
  if (session.kind === "none") redirect("/login");
  if (session.kind !== "user") return <LockedPanel title="Profile" />;

  const used = session.downloadsUsed;
  const width = `${Math.max(0, Math.min(100, (used / 10) * 100))}%`;
  const accountType = session.role === "admin" ? "Admin" : "Registered user";

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="serif text-[32px] leading-10">Profile</h1>
      <div className="mt-6 grid max-w-xl gap-6">
        <DefinitionList
          className="rounded-xl border border-border bg-card p-6"
          items={[
            { term: "Display name", value: session.name },
            { term: "Email", value: session.email },
            { term: "Account type", value: accountType },
          ]}
        />
        <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="usage">
          <h2 id="usage" className="text-xl leading-7 font-medium">
            Download usage
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">Registered accounts get 10 downloads.</p>
          <div className="mt-4 flex items-center gap-3">
            <p className="text-sm leading-5">{used} of 10 downloads used</p>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-border" aria-hidden>
              <i className="block h-full bg-brand" style={{ width }} />
            </div>
          </div>
        </section>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            <LogOut strokeWidth={1.5} />
            Log out
          </Button>
        </form>
      </div>
    </main>
  );
}
