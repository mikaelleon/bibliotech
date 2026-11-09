import { Redirect, Tabs, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AIAssistant } from "@/components/AIAssistant";
import { OfflineBanner } from "@/components/OfflineBanner";
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
  const blocked = session.kind === "none" || (session.kind === "user" && session.role === "admin");
  const showAssistant = !blocked && path === "/browse";

  return (
    <View style={styles.root}>
      {session.kind === "none" ? <Redirect href="/login" /> : null}
      {session.kind === "user" && session.role === "admin" ? <Redirect href="/admin-notice" /> : null}
      {blocked ? null : (
        <SafeAreaView edges={["top"]} style={styles.chrome}>
          <ShellHeader />
          <OfflineBanner />
        </SafeAreaView>
      )}
      <View style={styles.body}>
        <Tabs
          backBehavior="initialRoute"
          tabBar={() => (blocked ? null : <TabBar />)}
          screenOptions={{ headerShown: false, animation: "fade" }}
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
