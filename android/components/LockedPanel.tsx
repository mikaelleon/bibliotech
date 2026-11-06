import { ArrowRight, Lock } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { colors, font } from "@/theme/tokens";

export function LockedPanel({ title }: { title: string }) {
  return (
    <View style={styles.page}>
      <Text style={styles.h1}>{title}</Text>
      <View style={styles.panel}>
        <Lock color={colors.muted} size={24} strokeWidth={1.5} />
        <Text style={styles.h2}>Create a free account to unlock this.</Text>
        <Text style={styles.body}>
          My Library keeps every book you download in one place. An account also adds Favorites and raises your limit from 5 to 10 downloads.
        </Text>
        <Button label="Register" href="/register" full icon={<ArrowRight />} style={styles.register} />
        <Button label="I already have an account" href="/login" variant="link" style={styles.login} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  h1: {
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: colors.ink,
  },
  panel: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
  },
  h2: {
    marginTop: 16,
    fontFamily: font.serif,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.24,
    color: colors.ink,
  },
  body: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  register: {
    marginTop: 24,
  },
  login: {
    marginTop: 8,
  },
});
