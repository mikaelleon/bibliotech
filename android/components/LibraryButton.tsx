import { BookmarkCheck, BookmarkPlus } from "lucide-react-native";
import { Animated, Pressable, StyleSheet } from "react-native";

import { Crossfade } from "@/components/Crossfade";
import { usePressScale } from "@/hooks/use-press-scale";
import { colors } from "@/theme/tokens";

/** Bookmark on a Library card, so the card's control acts on Library (not Favorites). */
export function LibraryButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  const press = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        {...press.handlers}
        accessibilityRole="button"
        accessibilityLabel={`Keep ${title} in Library`}
        accessibilityState={{ selected: active }}
        onPress={onPress}
        style={styles.button}
      >
        <Crossfade
          active={active}
          off={<BookmarkPlus color={colors.ink} size={20} strokeWidth={1.5} />}
          on={<BookmarkCheck color={colors.ink} size={20} strokeWidth={1.5} />}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
