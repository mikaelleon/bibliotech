import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/session";

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <Suspense>
      <AppShell session={session}>{children}</AppShell>
    </Suspense>
  );
}
