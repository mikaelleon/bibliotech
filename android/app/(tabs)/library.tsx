import { Library } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export default function LibraryScreen() {
  const { session } = useSession();
  if (session.kind !== "user") return <LockedPanel title="My Library" />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>My Library</Text>
      <View style={styles.gap}>
        <EmptyState
          icon={<Library color={colors.muted} size={24} strokeWidth={1.5} />}
          title="Your library is empty."
          action={<Button label="Browse books" href="/browse" variant="outline" />}
        >
          Books you download will appear here, so you can find them again.
        </EmptyState>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: colors.ink,
  },
  gap: {
    marginTop: 24,
  },
});
