import { useEffect, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { durHover, durReduced, easeOut } from "@/theme/motion";

/**
 * Two states stacked in one box. The leaving one fades and shrinks to 0.8, the entering one grows
 * back to 1, over 150ms. No blur on Android: it is expensive, so opacity and scale carry it.
 */
export function Crossfade({ on, off, active }: { on: ReactNode; off: ReactNode; active: boolean }) {
  const reduce = useReduceMotion();
  const [value] = useState(() => new Animated.Value(active ? 1 : 0));

  useEffect(() => {
    Animated.timing(value, {
      toValue: active ? 1 : 0,
      duration: reduce ? durReduced : durHover,
      easing: easeOut,
      useNativeDriver: true,
    }).start();
  }, [active, reduce, value]);

  const shrink = (from: number, to: number) =>
    reduce ? 1 : value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <View>
      <Animated.View style={{ opacity: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: shrink(1, 0.8) }] }}>
        {off}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: value, transform: [{ scale: shrink(0.8, 1) }] }]}>
        {on}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
