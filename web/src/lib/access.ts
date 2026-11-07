import { redirect } from "next/navigation";

import { landingFor, safeNext } from "@/lib/auth-rules";
import { getSession } from "@/lib/session";

/** An account that is already signed in does not stay on Log in or Register. Guests still can, so they can upgrade. */
export async function redirectSignedInFromAuth(next?: string) {
  const session = await getSession();
  if (session.kind !== "user") return;
  redirect(landingFor(session.role, safeNext(next)));
}

/** The public landing page is for readers. Administrators land on the dashboard. */
export async function redirectAdminFromLanding() {
  const session = await getSession();
  if (session.kind === "user" && session.role === "admin") redirect("/admin");
}
