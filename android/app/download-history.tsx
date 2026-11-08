import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";

/** Older links open the history section of the Downloads screen. */
export default function DownloadHistoryScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/downloads" as Href);
  }, [router]);

  return null;
}
