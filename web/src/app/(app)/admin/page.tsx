import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await getSession();
  if (session.kind !== "user" || session.role !== "admin") redirect("/browse");

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <h1 className="serif text-[32px] leading-10">Admin dashboard</h1>
      <p className="mt-2 text-muted-foreground">Admin dashboard: coming in Phase 2.</p>
      <p className="mt-4 max-w-[560px] text-sm leading-5 text-muted-foreground">
        This page is only served to accounts whose role is admin. Everyone else is sent back to Browse.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/browse">Back to Browse</Link>
      </Button>
    </main>
  );
}
