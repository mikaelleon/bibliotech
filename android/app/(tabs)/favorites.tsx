import { Heart } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { LockedPanel } from "@/components/LockedPanel";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export default function FavoritesScreen() {
  const { session } = useSession();
  if (session.kind !== "user") return <LockedPanel title="Favorites" />;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Favorites</Text>
      <View style={styles.gap}>
        <EmptyState
          icon={<Heart color={colors.muted} size={24} strokeWidth={1.5} />}
          title="No favorites yet."
          action={<Button label="Browse books" href="/browse" variant="outline" />}
        >
          Open a book and choose Save to add it here.
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
