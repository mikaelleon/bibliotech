import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, radius, space } from "@/theme/tokens";

export function Banner({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.banner}>
      {icon}
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space[12],
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: space[32],
  },
  text: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
