import { useRouter, type Href } from "expo-router";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Animated } from "react-native";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { usePressScale } from "@/hooks/use-press-scale";
import { colors, font, radius } from "@/theme/tokens";

type IconProps = { color?: string; size?: number; strokeWidth?: number };

type ButtonProps = {
  label: string;
  variant?: "primary" | "outline" | "link";
  full?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onPress?: () => void;
  href?: Href;
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  accessibilityLabel?: string;
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = "primary",
  full = false,
  disabled = false,
  busy = false,
  onPress,
  href,
  icon,
  iconPosition = "end",
  accessibilityLabel,
  numberOfLines,
  style,
}: ButtonProps) {
  const router = useRouter();
  const off = disabled || busy;
  const press = usePressScale();
  const ink =
    variant === "primary" ? colors.onPrimary : variant === "link" ? colors.atext : colors.ink;
  const tinted = isValidElement(icon)
    ? cloneElement(icon as ReactElement<IconProps>, { color: ink, size: 16, strokeWidth: 1.5 })
    : null;

  return (
    <Animated.View
      style={[
        full && variant !== "link" ? styles.full : styles.fit,
        variant !== "link" && !off && { transform: [{ scale: press.scale }] },
      ]}
    >
    <Pressable
      {...press.handlers}
      accessibilityRole={variant === "link" ? "link" : "button"}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={() => {
        if (off) return;
        onPress?.();
        if (href) router.push(href);
      }}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "link" && styles.link,
        full && variant !== "link" && styles.full,
        pressed && !off && variant === "primary" && styles.primaryPressed,
        pressed && !off && variant === "outline" && styles.outlinePressed,
        off && styles.off,
        style,
      ]}
    >
      {iconPosition === "start" ? tinted : null}
      <Text
        numberOfLines={numberOfLines}
        style={[
          styles.label,
          { color: ink },
          variant === "link" && styles.linkLabel,
          numberOfLines ? styles.wrap : null,
        ]}
      >
        {busy ? busyLabel(label) : label}
      </Text>
      {iconPosition === "end" ? tinted : null}
    </Pressable>
    </Animated.View>
  );
}

function busyLabel(label: string): string {
  if (label === "Log in") return "Logging in";
  if (label === "Create account") return "Creating account";
  return label;
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: 24,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  full: {
    width: "100%",
  },
  fit: {
    alignSelf: "flex-start",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryHover,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  outlinePressed: {
    backgroundColor: colors.bg,
  },
  link: {
    paddingHorizontal: 0,
    justifyContent: "flex-start",
    backgroundColor: "transparent",
  },
  label: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  wrap: {
    flexShrink: 1,
  },
  linkLabel: {
    color: colors.atext,
    textDecorationLine: "underline",
    textDecorationColor: colors.atext,
  },
  off: {
    opacity: 0.5,
  },
});
