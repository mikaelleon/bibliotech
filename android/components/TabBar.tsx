import { useRouter, usePathname, type Href } from "expo-router";
import { BookOpen, Heart, Library, Lock, User } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/lib/session";
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

  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      {items.map((item) => {
        const current = item.match(path);
        const Icon = item.icon;
        const label = item.lock ? `${item.label}, requires an account` : item.label;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: current }}
            aria-selected={current}
            onPress={() => router.push(item.href)}
            style={styles.tab}
          >
            <View style={[styles.icon, current && styles.iconOn]}>
              <Icon color={current ? colors.onPrimary : colors.ink} size={20} strokeWidth={1.5} />
              {item.lock ? (
                <Lock
                  color={current ? colors.onPrimary : colors.muted}
                  size={12}
                  strokeWidth={1.5}
                  style={styles.lock}
                />
              ) : null}
            </View>
            <Text style={[styles.label, current && styles.labelOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
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
  iconOn: {
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
