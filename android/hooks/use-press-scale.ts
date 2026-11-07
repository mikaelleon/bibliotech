import { useState } from "react";
import { Animated } from "react-native";

import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { durPress, easeOut } from "@/theme/motion";

/**
 * Press feedback: scale down on press-in, back to 1 on release (0.97 for controls, 0.98 for cards).
 * Spread `handlers` on the Pressable and put `scale` in an Animated transform.
 */
export function usePressScale(to = 0.97) {
  const reduce = useReduceMotion();
  const [scale] = useState(() => new Animated.Value(1));

  function animate(value: number) {
    if (reduce) return;
    Animated.timing(scale, { toValue: value, duration: durPress, easing: easeOut, useNativeDriver: true }).start();
  }

  return {
    scale,
    handlers: {
      onPressIn: () => animate(to),
      onPressOut: () => animate(1),
    },
  };
}
