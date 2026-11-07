import { Heart } from "lucide-react-native";
import { useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

import { Crossfade } from "@/components/Crossfade";
import { usePressScale } from "@/hooks/use-press-scale";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { durConfirm, easeOut } from "@/theme/motion";
import { colors } from "@/theme/tokens";

/** Heart toggle. Outline and filled hearts crossfade. Adding a favorite pulses once; removing does not. */
export function FavoriteButton({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const label = active ? "Remove from favorites" : "Add to favorites";
  const reduce = useReduceMotion();
  const press = usePressScale();
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
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        {...press.handlers}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        onPress={() => {
          if (!active) confirm();
          onPress();
        }}
        style={styles.button}
      >
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Crossfade
            active={active}
            off={<Heart color={colors.ink} fill="transparent" size={20} strokeWidth={1.5} />}
            on={<Heart color={colors.ink} fill={colors.ink} size={20} strokeWidth={1.5} />}
          />
        </Animated.View>
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
