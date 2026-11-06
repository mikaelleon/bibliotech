import { Heart } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { colors } from "@/theme/tokens";

export function FavoriteButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const label = active ? "Remove from favorites" : "Add to favorites";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.button}
    >
      <Heart
        color={colors.ink}
        fill={active ? colors.ink : "transparent"}
        size={20}
        strokeWidth={1.5}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
