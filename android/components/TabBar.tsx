import { useRouter, usePathname, type Href } from "expo-router";
import { BookOpen, Heart, Library, Lock, User } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePressScale } from "@/hooks/use-press-scale";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useSession } from "@/lib/session";
import { durMove, easeInOut } from "@/theme/motion";
import { colors, font, radius } from "@/theme/tokens";

type Item = {
  href: Href;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  lock?: boolean;
};

export function TabBar() {
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const locked = session.kind !== "user";

  const items: Item[] = [
    { href: "/browse", label: "Browse", icon: BookOpen, match: (value) => value === "/browse" || value.startsWith("/book") },
    { href: "/library", label: "Library", icon: Library, match: (value) => value === "/library", lock: locked },
    { href: "/favorites", label: "Favorites", icon: Heart, match: (value) => value === "/favorites", lock: locked },
    { href: "/profile", label: "Profile", icon: User, match: (value) => value === "/profile", lock: locked },
  ];

  const active = items.findIndex((item) => item.match(path));
  const indicator = useTabIndicator(active);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={indicator.onBarLayout}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 4) }]}
    >
      <Animated.View pointerEvents="none" style={[styles.indicator, indicator.style]} />
      {items.map((item, index) => {
        const current = index === active;
        const label = item.lock ? `${item.label}, requires an account` : item.label;
        return (
          <Tab
            key={item.label}
            item={item}
            label={label}
            current={current}
            onPress={() => router.push(item.href)}
            onIconLayout={index === 0 ? indicator.onIconLayout : undefined}
          />
        );
      })}
    </View>
  );
}

function Tab({
  item,
  label,
  current,
  onPress,
  onIconLayout,
}: {
  item: Item;
  label: string;
  current: boolean;
  onPress: () => void;
  onIconLayout?: (event: LayoutChangeEvent) => void;
}) {
  const press = usePressScale();
  const Icon = item.icon;
  return (
    <Pressable
      {...press.handlers}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: current }}
      aria-selected={current}
      onPress={onPress}
      style={styles.tab}
    >
      <Animated.View onLayout={onIconLayout} style={[styles.icon, { transform: [{ scale: press.scale }] }]}>
        <Icon color={current ? colors.onPrimary : colors.ink} size={20} strokeWidth={1.5} />
        {item.lock ? (
          <Lock color={current ? colors.onPrimary : colors.muted} size={12} strokeWidth={1.5} style={styles.lock} />
        ) : null}
      </Animated.View>
      <Text style={[styles.label, current && styles.labelOn]}>{item.label}</Text>
    </Pressable>
  );
}

/**
 * One pill behind the active tab. It slides between tabs (220ms, ease-in-out) and stretches 12%
 * along the way. Tabs share the bar width equally, so each pill's x comes from the bar width.
 */
function useTabIndicator(active: number) {
  const reduce = useReduceMotion();
  const [barWidth, setBarWidth] = useState(0);
  const [iconY, setIconY] = useState<number | null>(null);
  const [x] = useState(() => new Animated.Value(0));
  const [stretch] = useState(() => new Animated.Value(1));
  const placed = useRef(false);

  const tabWidth = barWidth / 4;
  const target = active * tabWidth + (tabWidth - 48) / 2;

  useEffect(() => {
    if (barWidth === 0 || active < 0) return;
    if (!placed.current || reduce) {
      x.setValue(target);
      placed.current = true;
      return;
    }
    Animated.parallel([
      Animated.timing(x, { toValue: target, duration: durMove, easing: easeInOut, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1.12, duration: durMove / 2, easing: easeInOut, useNativeDriver: true }),
        Animated.timing(stretch, { toValue: 1, duration: durMove / 2, easing: easeInOut, useNativeDriver: true }),
      ]),
    ]).start();
  }, [active, barWidth, reduce, stretch, target, x]);

  return {
    onBarLayout: (event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width),
    // The first icon's offset inside its tab, plus the bar's 4px top padding.
    onIconLayout: (event: LayoutChangeEvent) => setIconY(event.nativeEvent.layout.y + 4),
    style: {
      opacity: active >= 0 && barWidth > 0 && iconY !== null ? 1 : 0,
      top: iconY ?? 0,
      transform: [{ translateX: x }, { scaleX: stretch }],
    },
  };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingTop: 4,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  icon: {
    width: 48,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    left: 0,
    width: 48,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  lock: {
    position: "absolute",
    top: 0,
    right: 4,
  },
  label: {
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
  labelOn: {
    color: colors.ink,
  },
});
