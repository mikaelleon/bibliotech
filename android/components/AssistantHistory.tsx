import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Skeleton } from "@/components/Skeleton";
import type { ChatSummary } from "@/lib/assistant";
import { colors, font, radius } from "@/theme/tokens";

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The reader's saved chats. Deleting asks first, inline, because a deleted chat can't come back. */
export function AssistantHistory({
  chats,
  error,
  activeId,
  onOpen,
  onDelete,
  onDeleteAll,
}: {
  chats: ChatSummary[] | null;
  error: string | null;
  activeId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}) {
  const [confirm, setConfirm] = useState<string | "all" | null>(null);

  return (
    <View>
      <Text style={styles.heading}>Your chats</Text>
      {error ? <Text style={styles.note}>{error}</Text> : null}

      {chats === null && !error ? (
        <View style={styles.skeletons} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Skeleton style={{ height: 40, width: "100%" }} />
          <Skeleton style={{ height: 40, width: "100%" }} />
          <Skeleton style={{ height: 40, width: "75%" }} />
        </View>
      ) : null}

      {chats && chats.length === 0 && !error ? (
        <Text style={styles.note}>No saved chats yet. Your conversations will show up here.</Text>
      ) : null}

      {chats?.map((chat) => (
        <View key={chat.id} style={styles.row}>
          {confirm === chat.id ? (
            <View style={styles.confirm}>
              <Text style={styles.confirmText}>Delete this chat?</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setConfirm(null);
                  onDelete(chat.id);
                }}
                style={styles.primary}
              >
                <Text style={styles.primaryLabel}>Delete</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setConfirm(null)} style={styles.outline}>
                <Text style={styles.outlineLabel}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.line}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open chat: ${chat.title}`}
                onPress={() => onOpen(chat.id)}
                style={styles.open}
              >
                <Text numberOfLines={1} style={[styles.title, chat.id === activeId && { fontFamily: font.medium }]}>
                  {chat.title}
                </Text>
                <Text style={styles.when}>{when(chat.updatedAt)}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete chat: ${chat.title}`}
                onPress={() => setConfirm(chat.id)}
                style={styles.trash}
              >
                <Trash2 color={colors.muted} size={16} strokeWidth={1.5} />
              </Pressable>
            </View>
          )}
        </View>
      ))}

      <Text style={styles.footnote}>
        Chats are saved to your account for up to 90 days of inactivity. You can delete them any time.
      </Text>

      {chats && chats.length > 1 ? (
        confirm === "all" ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>Delete all chats?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setConfirm(null);
                onDeleteAll();
              }}
              style={styles.primary}
            >
              <Text style={styles.primaryLabel}>Delete all</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConfirm(null)} style={styles.outline}>
              <Text style={styles.outlineLabel}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setConfirm("all")} style={styles.deleteAll}>
            <Text style={styles.deleteAllLabel}>Delete all chats</Text>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  note: { marginTop: 8, fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  skeletons: { marginTop: 12, gap: 12 },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  line: { flexDirection: "row", alignItems: "center" },
  open: { flex: 1, minHeight: 44, paddingVertical: 8, justifyContent: "center" },
  title: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  when: { fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  trash: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  confirm: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  confirmText: { flex: 1, fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  primary: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { fontFamily: font.medium, fontSize: 12, color: colors.onPrimary },
  outline: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineLabel: { fontFamily: font.medium, fontSize: 12, color: colors.ink },
  footnote: { marginTop: 16, fontFamily: font.sans, fontSize: 12, lineHeight: 16, color: colors.muted },
  deleteAll: { minHeight: 44, justifyContent: "center" },
  deleteAllLabel: { fontFamily: font.sans, fontSize: 14, color: colors.atext, textDecorationLine: "underline" },
});
