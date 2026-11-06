import { StyleSheet, Text, View } from "react-native";

import { colors, font, radius } from "@/theme/tokens";

export type DefinitionItem = {
  term: string;
  value: string;
};

type DefinitionListProps = {
  items: DefinitionItem[];
  card?: boolean;
};

export function DefinitionList({ items, card = false }: DefinitionListProps) {
  return (
    <View style={card ? styles.card : undefined}>
      {items.map((item) => (
        <View key={item.term} style={styles.row}>
          <Text style={styles.term}>{item.term}</Text>
          <Text style={styles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 24,
  },
  row: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 8,
  },
  term: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  value: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
});
