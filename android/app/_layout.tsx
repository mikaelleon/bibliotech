import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Newsreader_400Regular } from "@expo-google-fonts/newsreader";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { CircleAlert } from "lucide-react-native";
import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "index",
};

export function ErrorBoundary({ retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.error}>
      <EmptyState
        alert
        icon={<CircleAlert color={colors.atext} size={24} strokeWidth={1.5} />}
        title="We couldn’t load this page"
        action={<Button label="Try again" variant="outline" onPress={() => void retry()} />}
      >
        The library server did not answer. Check your connection and try again.
      </EmptyState>
    </View>
  );
}

/** Holds the splash screen until fonts are in and the saved session has been read. */
function ReadyGate({ fontsDone, children }: { fontsDone: boolean; children: ReactNode }) {
  const { ready } = useSession();
  const done = fontsDone && ready;

  useEffect(() => {
    if (done) void SplashScreen.hideAsync();
  }, [done]);

  return done ? children : null;
}

function RoleGate({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (session.kind === "user" && session.role === "admin" && path !== "/admin-notice") {
      router.replace("/admin-notice");
    }
  }, [path, router, session]);

  return children;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Newsreader_400Regular,
  });

  return (
    <SafeAreaProvider style={styles.root}>
      <SessionProvider>
        <StatusBar style="dark" />
        <ReadyGate fontsDone={loaded || Boolean(error)}>
          <RoleGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="book/[id]" />
              <Stack.Screen name="search" />
              <Stack.Screen name="admin-notice" />
            </Stack>
          </RoleGate>
        </ReadyGate>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  error: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    justifyContent: "center",
  },
});
