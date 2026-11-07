import { useRouter } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { colors, font, radius } from "@/theme/tokens";

export type ShelfKind = "favorites" | "library";

const copy: Record<ShelfKind, { title: string; body: string }> = {
  favorites: {
    title: "Create a free account to keep favorites",
    body: "Favorites keeps the books you mark with a heart. An account also raises your download limit from 5 to 10.",
  },
  library: {
    title: "Create a free account to keep a Library",
    body: "Library keeps the books you want to come back to. Adding a book doesn't use a download.",
  },
};

/** Shown when a guest presses a heart or Add to Library. Same copy as the web prompt. */
export function SignUpPrompt({ kind, onClose }: { kind: ShelfKind | null; onClose: () => void }) {
  const router = useRouter();
  const text = kind ? copy[kind] : null;

  function go(path: "/register" | "/login") {
    onClose();
    router.push(path);
  }

  return (
    <Modal visible={kind !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={styles.scrim} onPress={onClose}>
        <Pressable accessibilityRole="none" style={styles.card} onPress={() => undefined}>
          <Text accessibilityRole="header" style={styles.title}>
            {text?.title}
          </Text>
          <Text style={styles.body}>{text?.body}</Text>
          <View style={styles.actions}>
            <Button label="Log in" variant="outline" onPress={() => go("/login")} />
            <Button label="Register" onPress={() => go("/register")} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "center",
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 24,
    gap: 8,
  },
  title: {
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  body: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
