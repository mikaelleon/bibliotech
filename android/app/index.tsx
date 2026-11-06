import { Redirect } from "expo-router";

import { useSession } from "@/lib/session";

export default function Index() {
  const { session } = useSession();
  if (session.kind === "none") return <Redirect href="/login" />;
  return <Redirect href="/browse" />;
}
