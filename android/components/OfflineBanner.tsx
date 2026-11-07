import { useNetworkState } from "expo-network";
import { WifiOff } from "lucide-react-native";
import { View } from "react-native";

import { Banner } from "@/components/Banner";
import { colors } from "@/theme/tokens";

/** Native network state. The web `online` event is not a function in React Native. */
export function OfflineBanner() {
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;

  if (!offline) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
      <Banner icon={<WifiOff color={colors.ink} size={20} strokeWidth={1.5} />}>
        {"You're offline. Showing the books you've already loaded."}
      </Banner>
    </View>
  );
}
