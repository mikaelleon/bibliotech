import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FadeIn } from "@/components/FadeIn";
import { colors, font } from "@/theme/tokens";

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  children: string;
  action?: ReactNode;
  alert?: boolean;
};

export function EmptyState({ icon, title, children, action, alert = false }: EmptyStateProps) {
  return (
    <FadeIn>
    <View accessibilityRole={alert ? "alert" : undefined} style={styles.panel}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{children}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  panel: {
    maxWidth: 560,
    paddingVertical: 32,
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
