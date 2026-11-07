import { useEffect, useState, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { durPage, durReduced, easeOut, stagger, staggerCap } from "@/theme/motion";

/**
 * Entrance: fade in and rise 8px over 250ms with ease-out. Plays once, on mount.
 * `index` staggers siblings by 30ms (capped at 12). `start` delays the whole group.
 * With reduced motion it only fades, in 100ms. `skip` shows the content at once.
 */
export function FadeIn({
  children,
  index = 0,
  start = 0,
  skip = false,
  style,
}: {
  children: ReactNode;
  index?: number;
  start?: number;
  skip?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  // Read once: a list row that remounts while scrolling must not replay its entrance.
  const [instant] = useState(skip);
  const [progress] = useState(() => new Animated.Value(instant ? 1 : 0));

  useEffect(() => {
    if (instant) return;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: reduce ? durReduced : durPage,
      delay: reduce ? 0 : start + Math.min(index, staggerCap) * stagger,
      easing: easeOut,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [instant, index, progress, reduce, start]);

  const translateY = reduce ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

/**
 * True for the first moments after a list mounts. Rows rendered later (scrolling back, recycling)
 * get `skip` so only the first screenful staggers in.
 */
export function useFreshList(windowMs = 700): boolean {
  const [fresh, setFresh] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setFresh(false), windowMs);
    return () => clearTimeout(timer);
  }, [windowMs]);
  return fresh;
}
