import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, space } from "@/theme/tokens";

export function PageHeader({ title, lede, action }: { title: string; lede?: string; action?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {lede ? <Text style={styles.lede}>{lede}</Text> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space[16],
  },
  copy: {
    gap: space[8],
  },
  title: {
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  lede: {
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
});
