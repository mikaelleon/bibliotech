import { WifiOff } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Banner } from "@/components/Banner";
import { colors } from "@/theme/tokens";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOffline(window.navigator.onLine === false);
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
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <Banner icon={<WifiOff color={colors.ink} size={20} strokeWidth={1.5} />}>
        {"You're offline. Showing the books you've already loaded."}
      </Banner>
    </View>
  );
}
