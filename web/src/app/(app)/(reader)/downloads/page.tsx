import Link from "next/link";

import { DownloadHistory } from "@/components/download-history";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export const metadata = { title: "Downloads" };

export default async function DownloadsPage() {
  const session = await getSession();
  if (session.kind !== "user" || session.role === "admin") {
    return (
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
        <PageHeader title="Downloads" lede="An account keeps the books you download." />
        <Button asChild className="mt-6">
          <Link href="/register">Register</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Downloads"
        lede="Every book this account has downloaded."
      />
      <div id="history" className="mt-8 scroll-mt-24">
        <DownloadHistory used={session.downloadsUsed} limit={session.downloadLimit} />
      </div>
    </main>
  );
}
