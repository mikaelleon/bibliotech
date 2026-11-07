import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, radius } from "@/theme/tokens";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  children: string;
  action?: ReactNode;
  alert?: boolean;
};

export function EmptyState({ icon, title, children, action, alert = false }: EmptyStateProps) {
  return (
    <View accessibilityRole={alert ? "alert" : undefined} style={styles.panel}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 32,
  },
  title: {
    marginTop: 16,
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  body: {
    marginTop: 8,
    maxWidth: 560,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  action: {
    marginTop: 24,
  },
});
