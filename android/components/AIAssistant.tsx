import { MessagesSquare, Send, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { colors, font, radius } from "@/theme/tokens";

const prompts = [
  "Find a short book about economics",
  "What is in the Science category?",
  "Suggest a classic I can finish in a week",
];

export function AIAssistant() {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [translate] = useState(() => new Animated.Value(560));

  function close() {
    if (reduce) {
      setOpen(false);
      return;
    }
    Animated.timing(translate, {
      toValue: 560,
      duration: 200,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOpen(false);
    });
  }

  useEffect(() => {
    if (!open) return;
    if (reduce) {
      translate.setValue(0);
      return;
    }
    translate.setValue(560);
    Animated.timing(translate, {
      toValue: 0,
      duration: 250,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [open, reduce, translate]);

  return (
    <>
      {open ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask AI"
          onPress={() => setOpen(true)}
          style={[styles.fab, { bottom: 64 + insets.bottom + 16 }]}
        >
          <MessagesSquare color={colors.ink} size={16} strokeWidth={1.5} />
          <Text style={styles.fabLabel}>Ask AI</Text>
        </Pressable>
      )}
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close AI assistant"
            onPress={close}
            style={styles.scrim}
          />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: translate }] }]}>
            <View accessibilityElementsHidden style={styles.handle} />
            <View style={styles.sheetHead}>
              <View style={styles.titleRow}>
                <MessagesSquare color={colors.ink} size={20} strokeWidth={1.5} />
                <Text style={styles.sheetTitle}>AI assistant</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close AI assistant"
                onPress={close}
                style={styles.close}
              >
                <X color={colors.ink} size={20} strokeWidth={1.5} />
              </Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={styles.coming}>AI assistant coming in Phase 2</Text>
              <Text style={styles.note}>
                It will answer questions about the library and help you pick your next book.
              </Text>
              <Text style={styles.try}>Try asking</Text>
              {prompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  accessibilityRole="button"
                  accessibilityLabel={prompt}
                  onPress={() => setDraft(prompt)}
                  style={styles.prompt}
                >
                  <Text style={styles.promptLabel}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.composer, { paddingBottom: 16 + insets.bottom }]}>
              <View style={styles.composerRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Ask about a book"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="Message the assistant"
                  style={styles.message}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  accessibilityState={{ disabled: true }}
                  disabled
                  style={styles.send}
                >
                  <Send color={colors.onPrimary} size={16} strokeWidth={1.5} />
                </Pressable>
              </View>
              <Text style={styles.hint}>Sending is switched off until Phase 2.</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 8,
  },
  fabLabel: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  modal: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  sheet: {
    height: 560,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 12,
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
    alignSelf: "center",
    marginTop: 8,
  },
  sheetHead: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  coming: {
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  note: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  try: {
    marginTop: 16,
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  prompt: {
    minHeight: 44,
    justifyContent: "center",
  },
  promptLabel: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  composer: {
    padding: 16,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  message: {
    flex: 1,
    height: 44,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    fontFamily: font.sans,
    fontSize: 14,
    color: colors.ink,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },
  hint: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
});
