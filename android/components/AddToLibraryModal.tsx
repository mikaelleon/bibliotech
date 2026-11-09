import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { addBookToGroup, createGroup, loadCollections, type CollectionGroup, type CollectionKind } from "@/lib/collections";
import { colors, font, radius } from "@/theme/tokens";

type Choice = { mode: "library" } | { mode: "existing"; id: string } | { mode: "new" };

/** Shown when a book is added to Library. Skipping a group leaves it on the shelf only. */
export function AddToLibraryModal({
  visible,
  userId,
  bookId,
  onClose,
  onAdded,
}: {
  visible: boolean;
  userId: string;
  bookId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [choice, setChoice] = useState<Choice>({ mode: "library" });
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CollectionKind>("reading_list");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setChoice({ mode: "library" });
    setName("");
    setKind("reading_list");
    setMessage(null);
    void loadCollections(userId).then(setGroups);
  }, [visible, userId]);

  async function confirm() {
    setBusy(true);
    setMessage(null);
    onAdded();
    let problem: string | null = null;
    if (choice.mode === "existing") {
      const ok = await addBookToGroup(userId, choice.id, bookId);
      if (!ok) problem = "The book is in your Library, but it couldn't be filed.";
    } else if (choice.mode === "new") {
      const created = await createGroup(userId, name, kind);
      if ("error" in created) {
        setMessage(created.error);
        setBusy(false);
        return;
      }
      const ok = await addBookToGroup(userId, created.id, bookId);
      if (!ok) problem = "The book is in your Library, but it couldn't be filed.";
    }
    setMessage(problem);
    setBusy(false);
    if (!problem) onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Add to Library</Text>
          <Text style={styles.note}>This does not use a download. Leave it on Library, or file it in a reading list or collection.</Text>
          <ScrollView style={styles.list}>
            <ChoiceRow label="Library" detail="The shelf, with no group" on={choice.mode === "library"} onPress={() => setChoice({ mode: "library" })} />
            {groups.map((group) => (
              <ChoiceRow
                key={group.id}
                label={group.name}
                detail={group.kind === "reading_list" ? "Reading list" : "Collection"}
                on={choice.mode === "existing" && choice.id === group.id}
                onPress={() => setChoice({ mode: "existing", id: group.id })}
              />
            ))}
            <ChoiceRow label="Create new" detail="A reading list or a collection" on={choice.mode === "new"} onPress={() => setChoice({ mode: "new" })} />
          </ScrollView>
          {choice.mode === "new" ? (
            <View style={styles.newBox}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor={colors.muted}
                maxLength={80}
                style={styles.input}
              />
              <View style={styles.kinds}>
                <Button label="Reading list" variant={kind === "reading_list" ? "primary" : "outline"} onPress={() => setKind("reading_list")} />
                <Button label="Collection" variant={kind === "collection" ? "primary" : "outline"} onPress={() => setKind("collection")} />
              </View>
            </View>
          ) : null}
          {message ? <Text style={styles.note}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="outline" onPress={onClose} />
            <Button label="Add" disabled={busy || (choice.mode === "new" && name.trim().length === 0)} onPress={() => void confirm()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ChoiceRow({ label, detail, on, onPress }: { label: string; detail: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={styles.row}>
      <View style={[styles.dot, on && styles.dotOn]} />
      <View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.note}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(20,22,29,0.4)", justifyContent: "center", padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, padding: 24, gap: 12, maxHeight: "80%" },
  title: { fontFamily: font.title, fontSize: 28, lineHeight: 34, color: colors.ink },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  list: { maxHeight: 240 },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 },
  rowLabel: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  dotOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  newBox: { gap: 8 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.panel, paddingHorizontal: 12, color: colors.ink, fontFamily: font.sans },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
});
