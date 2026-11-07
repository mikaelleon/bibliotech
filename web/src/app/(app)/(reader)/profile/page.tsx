import Link from "next/link";

import { AccountPanel } from "@/components/account-panel";
import { DownloadsPanel } from "@/components/downloads-panel";
import { PageHeader } from "@/components/page-header";
import { SecurityPanel } from "@/components/security-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions";
import { getSession } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getSession();

  if (session.kind !== "user") {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <PageHeader title="Profile" lede="You're browsing as a guest." />
        <section className="mt-6 max-w-xl rounded-xl bg-card p-8">
          <h2 className="text-xl leading-7 font-medium">Account</h2>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            An account keeps a library and favorites, and raises the download limit from 5 to 10.
          </p>
          <div className="mt-4 flex flex-col items-start gap-3">
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
            <Link href="/login" className="text-sm leading-5 text-brand-text underline">
              Log in
            </Link>
          </div>
          <h2 className="mt-8 text-xl leading-7 font-medium">Theme</h2>
          <div className="mt-4">
            <ThemeToggle />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Profile" />
      <div className="mt-6 grid max-w-xl gap-6">
        {session.role !== "admin" && !session.verified ? <VerifyEmailBanner email={session.email} /> : null}
        <AccountPanel name={session.name} email={session.email} />
        {session.role !== "admin" ? <DownloadsPanel session={session} /> : null}
        <SecurityPanel />
        <section className="rounded-xl bg-card p-8" aria-labelledby="preferences-heading">
          <h2 id="preferences-heading" className="text-xl leading-7 font-medium">
            Theme
          </h2>
          <div className="mt-4">
            <ThemeToggle />
          </div>
        </section>
        {session.role === "admin" ? (
          <p className="text-sm leading-5">
            <Link href="/admin" className="text-brand-text underline">
              Open Admin
            </Link>
          </p>
        ) : null}
        <form action={logoutAction}>
          <button type="submit" className="min-h-11 text-sm leading-5 text-brand-text underline">
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}
