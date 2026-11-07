import Link from "next/link";
import type { ReactNode } from "react";

import { ErrorPanel } from "@/components/error-panel";
import { Button } from "@/components/ui/button";
import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!isAdminSession(session)) {
    return (
      <ErrorPanel
        title="You don't have access to this area"
        action={
          <Button asChild>
            <Link href="/browse">Back to Browse</Link>
          </Button>
        }
      >
        Admin pages are limited to accounts with the admin role. Ask an administrator to change your role, then sign in again.
      </ErrorPanel>
    );
  }

  return children;
}
