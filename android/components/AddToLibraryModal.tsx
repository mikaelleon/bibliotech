import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { loadCollections, saveCollectionChoices, type CollectionGroup } from "@/lib/collections";
import { colors, font, radius } from "@/theme/tokens";

/** Checkbox list. One book replaces its collections. Several books are only added. */
export function AddToLibraryModal({
  visible,
  userId,
  bookIds,
  onClose,
}: {
  visible: boolean;
  userId: string;
  bookIds: string[];
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<CollectionGroup[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bookKey = bookIds.join(",");
  const openKey = visible ? bookKey : "";
  const [seenKey, setSeenKey] = useState(openKey);
  if (seenKey !== openKey) {
    setSeenKey(openKey);
    setName("");
    setMessage(null);
    setChecked([]);
  }

  useEffect(() => {
    if (!visible) return;
    let live = true;
    const ids = bookKey ? bookKey.split(",") : [];
    void loadCollections(userId).then((rows) => {
      if (!live) return;
      setGroups(rows);
      const only = ids.length === 1 ? ids[0] : undefined;
      setChecked(only ? rows.filter((group) => group.bookIds.includes(only)).map((group) => group.id) : []);
    });
    return () => {
      live = false;
    };
  }, [visible, userId, bookKey]);

  function toggle(id: string) {
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save() {
    setBusy(true);
    const result = await saveCollectionChoices(bookIds, checked, name, userId, bookIds.length === 1);
    setBusy(false);
    if ("error" in result) {
      setMessage(result.error);
      return;
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.title}>Add to collection</Text>
          <ScrollView style={styles.list}>
            {groups.length === 0 ? <Text style={styles.note}>No collections yet.</Text> : null}
            {groups.map((group) => {
              const on = checked.includes(group.id);
              return (
                <Pressable key={group.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(group.id)} style={styles.row}>
                  <View style={[styles.box, on && styles.boxOn]} />
                  <Text style={styles.name}>{group.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.label}>New collection</Text>
          <TextInput value={name} onChangeText={setName} maxLength={80} style={styles.input} placeholderTextColor={colors.muted} />
          {message ? <Text style={styles.note}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button label="Cancel" variant="outline" onPress={onClose} />
            <Button label="Save" disabled={busy} onPress={() => void save()} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: "center", padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.panel, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 12, maxHeight: "80%" },
  title: { fontFamily: font.medium, fontSize: 20, lineHeight: 28, color: colors.ink },
  list: { maxHeight: 240 },
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12 },
  box: { width: 18, height: 18, borderWidth: 1, borderColor: colors.ink, borderRadius: 4 },
  boxOn: { backgroundColor: colors.ink },
  name: { fontFamily: font.sans, fontSize: 16, lineHeight: 24, color: colors.ink },
  label: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.ink },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.panel, paddingHorizontal: 12, color: colors.ink, fontFamily: font.sans },
  note: { fontFamily: font.sans, fontSize: 14, lineHeight: 20, color: colors.muted },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
});
