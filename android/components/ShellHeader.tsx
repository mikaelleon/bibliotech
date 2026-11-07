import { useGlobalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SearchBar } from "@/components/SearchBar";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export function ShellHeader() {
  const router = useRouter();
  const params = useGlobalSearchParams<{ q?: string; category?: string }>();
  const { session } = useSession();
  const query = typeof params.q === "string" ? params.q : "";
  const category = typeof params.category === "string" ? params.category : "";
  const [text, setText] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setText(query);
  }

  function submit() {
    const next = text.trim();
    router.push({
      pathname: "/search",
      params: {
        ...(next ? { q: next } : {}),
        ...(category ? { category } : {}),
      },
    } as unknown as Href);
  }

  return (
    <View style={[styles.bar, session.kind === "guest" && styles.guestGap]}>
      <SearchBar value={text} onChangeText={setText} onSubmit={submit} />
      {session.kind === "user" ? (
        <View style={styles.side}>
          <Text style={styles.quota}>{session.downloadsUsed} of 10</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${session.name} account`}
            onPress={() => router.push("/profile")}
            style={styles.avatar}
          >
            <Text style={styles.initial}>{session.name.slice(0, 1).toUpperCase()}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.side}>
          <Text style={styles.quota}>5 left</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Register"
            onPress={() => router.push("/register")}
            style={styles.register}
          >
            <Text style={styles.registerLabel}>Register</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  guestGap: {
    gap: 8,
  },
  side: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quota: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onPrimary,
  },
  register: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  registerLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
