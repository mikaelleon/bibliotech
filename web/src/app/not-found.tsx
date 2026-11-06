import Link from "next/link";

import { ErrorPanel } from "@/components/error-panel";
import { SearchBar } from "@/components/search-bar";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";

export default async function NotFound() {
  const session = await getSession();

  return (
    <AppShell session={session}>
      <ErrorPanel
        title="We couldn't find that page"
        action={
          <Button asChild>
            <Link href="/browse">Back to Browse</Link>
          </Button>
        }
      >
        The address may be mistyped, or the page may have moved.
      </ErrorPanel>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 md:px-8">
        <SearchBar />
      </div>
    </AppShell>
  );
}
