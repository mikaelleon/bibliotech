import { Search } from "lucide-react-native";
import { StyleSheet, TextInput, View } from "react-native";

import { colors, font, radius } from "@/theme/tokens";

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Search books",
  autoFocus = false,
}: SearchBarProps) {
  return (
    <View style={styles.wrap}>
      <Search color={colors.muted} size={20} strokeWidth={1.5} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search books"
        autoFocus={autoFocus}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: 44,
    padding: 0,
    fontFamily: font.sans,
    fontSize: 16,
    color: colors.ink,
  },
});
