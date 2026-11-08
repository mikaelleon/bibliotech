"use client";

import { useTransition } from "react";

import { logoutAction } from "@/lib/actions";
import { clearAppCache } from "@/lib/device-cache";
import { removeAllSaved } from "@/lib/offline-books";

/** Clears this account's offline books and the cached shell, then ends the session. */
export function LogoutButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="min-h-11 text-sm leading-5 text-brand-text underline disabled:opacity-60"
      onClick={() => {
        startTransition(async () => {
          await clearAppCache();
          await removeAllSaved(userId);
          await logoutAction();
        });
      }}
    >
      {pending ? "Logging out" : "Log out"}
    </button>
  );
}
