import { ArrowRight, Lock } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { colors, font } from "@/theme/tokens";

const copy: Record<string, string> = {
  Library: "Library keeps the books you want to come back to. Adding one doesn’t use a download.",
  Favorites: "Favorites keeps the books you mark with a heart.",
  Profile: "An account holds your name, password, and theme.",
};

/** Guest view for Library, Favorites, and Profile. Same copy as the web panel. */
export function LockedPanel({ title }: { title: string }) {
  return (
    <View style={styles.page}>
      <Text style={styles.h1}>{title}</Text>
      <View style={styles.panel}>
        <Lock color={colors.muted} size={24} strokeWidth={1.5} />
        <Text style={styles.h2}>Create a free account to unlock this</Text>
        <Text style={styles.body}>
          {copy[title] ?? "Create a free account to use this page."} An account also raises your download limit from 5 to 10.
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
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  panel: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 32,
  },
  h2: {
    marginTop: 16,
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
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
