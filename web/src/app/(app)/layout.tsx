import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { libraryAddedAt, listFavoriteIds, listLibraryIds } from "@/lib/records";
import { getSession } from "@/lib/session";

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const reader = session.kind === "user" && session.role !== "admin" ? session.id : null;
  const [favoriteIds, libraryIds, addedAt] = reader
    ? await Promise.all([listFavoriteIds(reader), listLibraryIds(reader), libraryAddedAt(reader)])
    : [[], [], {}];

  return (
    <Suspense>
      <AppShell session={session} shelves={{ favoriteIds, libraryIds, libraryAddedAt: addedAt }}>
        {children}
      </AppShell>
    </Suspense>
  );
}
