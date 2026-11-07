import { Redirect } from "expo-router";

import { useSession } from "@/lib/session";

export default function Index() {
  const { session } = useSession();
  if (session.kind === "none") return <Redirect href="/login" />;
  if (session.kind === "user" && session.role === "admin") return <Redirect href="/admin-notice" />;
  return <Redirect href="/browse" />;
}
