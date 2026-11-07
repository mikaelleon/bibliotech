import { Redirect, useRouter } from "expo-router";
import { Shield } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/lib/session";
import { colors } from "@/theme/tokens";

export default function AdminNoticeScreen() {
  const { session, logout } = useSession();
  const router = useRouter();

  if (session.kind === "none") return <Redirect href="/login" />;
  if (!(session.kind === "user" && session.role === "admin")) return <Redirect href="/browse" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.panel}>
        <EmptyState
          icon={<Shield color={colors.ink} size={24} strokeWidth={1.5} />}
          title="Admin tools are on the website"
          action={
            <Button
              label="Log out"
              onPress={() => {
                logout();
                router.replace("/login");
              }}
            />
          }
        >
          This app is for readers. Sign in on the website to see the dashboard, books, and users.
        </EmptyState>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
  },
  panel: {
    paddingHorizontal: 16,
  },
});
