import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, space } from "@/theme/tokens";

export function ErrorPanel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space[16],
    alignItems: "flex-start",
  },
  title: {
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
  body: {
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
});
