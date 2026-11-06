import { Redirect, Tabs, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AIAssistant } from "@/components/AIAssistant";
import { QuotaStrip } from "@/components/QuotaStrip";
import { ShellHeader } from "@/components/ShellHeader";
import { TabBar } from "@/components/TabBar";
import { useSession } from "@/lib/session";
import { colors } from "@/theme/tokens";

export const unstable_settings = {
  anchor: "browse",
};

export default function TabLayout() {
  const { session } = useSession();
  const path = usePathname();

  if (session.kind === "none") return <Redirect href="/login" />;

  const showAssistant = session.kind === "user" && path === "/browse";

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.chrome}>
        <ShellHeader />
        <QuotaStrip />
      </SafeAreaView>
      <View style={styles.body}>
        <Tabs
          tabBar={() => <TabBar />}
          screenOptions={{ headerShown: false }}
        >
          <Tabs.Screen name="browse" options={{ title: "Browse" }} />
          <Tabs.Screen name="library" options={{ title: "Library" }} />
          <Tabs.Screen name="favorites" options={{ title: "Favorites" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
        {showAssistant ? <AIAssistant /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  chrome: {
    backgroundColor: colors.bg,
  },
  body: {
    flex: 1,
  },
});
