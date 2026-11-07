import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font } from "@/theme/tokens";

type CheckboxProps = {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** 44px-tall tap target; the whole row toggles. */
export function Checkbox({ label, hint, checked, onChange }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Check color={colors.surface} size={14} strokeWidth={2.5} /> : null}
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.muted,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  text: {
    flex: 1,
  },
  label: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  hint: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
});
