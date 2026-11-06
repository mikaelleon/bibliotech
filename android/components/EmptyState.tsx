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
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontFamily: font.serif,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.24,
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
