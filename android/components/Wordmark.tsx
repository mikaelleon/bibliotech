import { BookOpen } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { colors, font } from "@/theme/tokens";

export function Wordmark() {
  return (
    <View accessibilityRole="header" style={styles.row}>
      <BookOpen color={colors.ink} size={20} strokeWidth={1.5} />
      <Text style={styles.name}>E-Library AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  name: {
    fontFamily: font.serif,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
});
