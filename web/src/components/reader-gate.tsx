import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { isAdminSession } from "@/lib/admin";
import { getSession } from "@/lib/session";

/** Administrators are operators. Reader routes send them to the dashboard. */
export async function ReaderGate({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (isAdminSession(session)) redirect("/admin");
  return children;
}
