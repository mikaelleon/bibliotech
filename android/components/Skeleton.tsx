import { useEffect, useState } from "react";
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { colors, radius } from "@/theme/tokens";

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduce) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduce]);

  return <Animated.View accessibilityElementsHidden style={[styles.block, { opacity }, style]} />;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.line,
    borderRadius: radius.cover,
  },
});
