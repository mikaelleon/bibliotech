import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { CATEGORIES, type Category } from "@/lib/types";
import { colors, font, radius } from "@/theme/tokens";

type CategoryFilterProps = {
  selected?: string;
};

export function CategoryFilter({ selected }: CategoryFilterProps) {
  const router = useRouter();
  const current = CATEGORIES.includes(selected as Category) ? selected : "All";
  const options = ["All", ...CATEGORIES];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const on = option === current;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityLabel={option}
            accessibilityState={{ selected: on }}
            onPress={() => router.setParams({ category: option === "All" ? "" : option })}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    marginHorizontal: -16,
    marginTop: 24,
  },
  row: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: {
    backgroundColor: colors.primary,
  },
  label: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  labelOn: {
    color: colors.onPrimary,
  },
});
