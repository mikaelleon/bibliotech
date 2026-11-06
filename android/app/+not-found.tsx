import { BookOpen } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/theme/tokens";

export default function NotFoundScreen() {
  return (
    <View style={styles.page}>
      <EmptyState
        icon={<BookOpen color={colors.muted} size={24} strokeWidth={1.5} />}
        title="This page is not in the library."
        action={<Button label="Back to Browse" href="/browse" variant="outline" />}
      >
        The link may be old. Browse the catalog to pick another title.
      </EmptyState>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
    justifyContent: "center",
  },
});
