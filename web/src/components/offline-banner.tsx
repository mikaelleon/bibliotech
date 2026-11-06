"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Banner } from "@/components/banner";

/** Shown when the browser reports no connection. The catalog is already on the page. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="px-4 py-3 md:px-8">
      <Banner icon={<WifiOff size={20} strokeWidth={1.5} aria-hidden />}>
        {"You're offline. Showing the books you've already loaded."}
      </Banner>
    </div>
  );
}
