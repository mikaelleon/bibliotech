import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";

import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { durPanel, durPanelExit, durReduced, easeIn, easeOut } from "@/theme/motion";
import { colors, font, radius } from "@/theme/tokens";

export type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void };

/** How long a toast stays before it leaves on its own. */
const TOAST_FOR = 4000;

/**
 * Bottom toast. Enters by rising 12px and fading in (250ms, ease-out). Leaves by dropping 8px and
 * fading out (200ms, ease-in), either after 4s or when the action is pressed. A new toast replaces
 * the old one while the old one leaves, so the two overlap.
 */
export function Toast({ item, onDone }: { item: ToastItem | null; onDone: () => void }) {
  const [leaving, setLeaving] = useState<ToastItem[]>([]);
  const [shown, setShown] = useState<ToastItem | null>(item);
  const forget = useCallback((id: number) => setLeaving((list) => list.filter((entry) => entry.id !== id)), []);

  // A new item: the one on screen starts leaving and the new one takes its place.
  if (item !== shown) {
    if (shown) setLeaving((list) => [...list, shown]);
    setShown(item);
  }

  useEffect(() => {
    if (!item) return;
    const timer = setTimeout(onDone, TOAST_FOR);
    return () => clearTimeout(timer);
  }, [item, onDone]);

  return (
    <>
      {leaving.map((old) => (
        <ToastCard
          key={old.id}
          item={old}
          leaving
          onLeft={forget}
        />
      ))}
      {shown ? <ToastCard key={shown.id} item={shown} onAction={onDone} /> : null}
    </>
  );
}

function ToastCard({
  item,
  leaving = false,
  onAction,
  onLeft,
}: {
  item: ToastItem;
  leaving?: boolean;
  onAction?: () => void;
  onLeft?: (id: number) => void;
}) {
  const reduce = useReduceMotion();
  // A leaving toast remounts in the leaving list, so it starts fully shown (1) and runs to 2.
  const [progress] = useState(() => new Animated.Value(leaving ? 1 : 0));

  useEffect(() => {
    const animation = leaving
      ? Animated.timing(progress, {
          toValue: 2,
          duration: reduce ? durReduced : durPanelExit,
          easing: easeIn,
          useNativeDriver: true,
        })
      : Animated.timing(progress, {
          toValue: 1,
          duration: reduce ? durReduced : durPanel,
          easing: easeOut,
          useNativeDriver: true,
        });
    animation.start(({ finished }) => {
      if (finished && leaving) onLeft?.(item.id);
    });
    return () => animation.stop();
  }, [item.id, leaving, onLeft, progress, reduce]);

  // 0 → 1 is the entrance, 1 → 2 is the exit.
  const opacity = progress.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] });
  const translateY = reduce ? 0 : progress.interpolate({ inputRange: [0, 1, 2], outputRange: [12, 0, 8] });

  return (
    <Animated.View
      accessibilityRole={leaving ? undefined : "alert"}
      importantForAccessibility={leaving ? "no-hide-descendants" : "auto"}
      pointerEvents={leaving ? "none" : "auto"}
      style={[styles.toast, { opacity, transform: [{ translateY }] }]}
    >
      <Text style={styles.text}>{item.message}</Text>
      {item.actionLabel ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.actionLabel}
          onPress={() => {
            item.onAction?.();
            onAction?.();
          }}
        >
          <Text style={styles.action}>{item.actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  text: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  action: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
    textDecorationLine: "underline",
  },
});
