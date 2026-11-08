import Link from "next/link";

import { DownloadHistory } from "@/components/download-history";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata = { title: "Download history" };

export default async function DownloadHistoryPage() {
  const session = await getSession();
  if (session.kind !== "user" || session.role === "admin") {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <PageHeader title="Download history" lede="An account keeps a record of the books you download." />
        <Button asChild className="mt-6">
          <Link href="/register">Register</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Download history"
        lede="Every book this account has downloaded."
        action={<Link href="/downloads" className="text-sm leading-5 text-brand-text underline">Books on this device</Link>}
      />
      <div className="mt-8">
        <DownloadHistory used={session.downloadsUsed} limit={session.downloadLimit} />
      </div>
    </main>
  );
}
