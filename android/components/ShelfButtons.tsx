import { BookmarkCheck, BookmarkPlus, Heart } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Crossfade } from "@/components/Crossfade";
import { usePressScale } from "@/hooks/use-press-scale";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { durConfirm, easeOut } from "@/theme/motion";
import { colors, font, radius } from "@/theme/tokens";

/**
 * Book page actions: "Add to Library" ↔ "In Library" and "Favorite" ↔ "Favorited".
 * The visible label states the state, so screen readers get the label only (no separate selected state).
 * Library never uses a download. Guests see both; pressing one calls `onLocked`.
 */
export function ShelfButtons({
  inLibrary,
  favorite,
  signedIn,
  onLibrary,
  onFavorite,
  onLocked,
}: {
  inLibrary: boolean;
  favorite: boolean;
  signedIn: boolean;
  onLibrary: () => void;
  onFavorite: () => void;
  onLocked: (kind: "library" | "favorites") => void;
}) {
  const reduce = useReduceMotion();
  const [pulse] = useState(() => new Animated.Value(1));

  function confirm() {
    if (reduce) return;
    pulse.setValue(1);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: durConfirm * 0.4, easing: easeOut, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: durConfirm * 0.6, easing: easeOut, useNativeDriver: true }),
    ]).start();
  }

  return (
    <View style={styles.row}>
      <ShelfToggle
        label={inLibrary ? "In Library" : "Add to Library"}
        filled={inLibrary}
        icon={
          <Crossfade
            active={inLibrary}
            off={<BookmarkPlus color={colors.ink} size={16} strokeWidth={1.5} />}
            on={<BookmarkCheck color={colors.onPrimary} size={16} strokeWidth={1.5} />}
          />
        }
        onPress={() => (signedIn ? onLibrary() : onLocked("library"))}
      />
      <ShelfToggle
        label={favorite ? "Favorited" : "Favorite"}
        filled={false}
        icon={
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Crossfade
              active={favorite}
              off={<Heart color={colors.ink} fill="transparent" size={16} strokeWidth={1.5} />}
              on={<Heart color={colors.ink} fill={colors.ink} size={16} strokeWidth={1.5} />}
            />
          </Animated.View>
        }
        onPress={() => {
          if (!signedIn) return onLocked("favorites");
          if (!favorite) confirm();
          onFavorite();
        }}
      />
    </View>
  );
}

function ShelfToggle({
  label,
  filled,
  icon,
  onPress,
}: {
  label: string;
  filled: boolean;
  icon: ReactNode;
  onPress: () => void;
}) {
  const press = usePressScale();
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        {...press.handlers}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[styles.toggle, filled ? styles.filled : styles.outline]}
      >
        {icon}
        <Text style={[styles.label, filled && styles.labelFilled]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toggle: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  filled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  labelFilled: {
    color: colors.onPrimary,
  },
});
