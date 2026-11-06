import { Check, CircleAlert, Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, font, radius } from "@/theme/tokens";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  email?: boolean;
  autoComplete?: "email" | "password" | "name" | "off" | "current-password" | "new-password";
  error?: string;
  hint?: string;
  success?: string;
};

export function Field({
  label,
  value,
  onChangeText,
  secure = false,
  email = false,
  autoComplete = "off",
  error,
  hint,
  success,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const invalid = Boolean(error);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !visible}
          keyboardType={email ? "email-address" : "default"}
          autoCapitalize={email ? "none" : "sentences"}
          autoCorrect={!email && !secure}
          autoComplete={autoComplete}
          textContentType={textContentType(autoComplete)}
          aria-invalid={invalid}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          style={[styles.input, secure && styles.inputSecure, invalid && styles.bad]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            onPress={() => setVisible((current) => !current)}
            style={styles.eye}
          >
            {visible ? (
              <EyeOff color={colors.muted} size={20} strokeWidth={1.5} />
            ) : (
              <Eye color={colors.muted} size={20} strokeWidth={1.5} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View accessibilityRole="alert" style={styles.row}>
          <CircleAlert color={colors.atext} size={16} strokeWidth={1.5} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      {!error && success ? (
        <View style={styles.row}>
          <Check color={colors.ink} size={16} strokeWidth={1.5} />
          <Text style={styles.success}>{success}</Text>
        </View>
      ) : null}
      {!error && !success && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function textContentType(
  autoComplete: FieldProps["autoComplete"],
): "emailAddress" | "password" | "name" | "newPassword" | "none" {
  if (autoComplete === "email") return "emailAddress";
  if (autoComplete === "password" || autoComplete === "current-password") return "password";
  if (autoComplete === "new-password") return "newPassword";
  if (autoComplete === "name") return "name";
  return "none";
}

const styles = StyleSheet.create({
  label: {
    fontFamily: font.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.panel,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    fontFamily: font.sans,
    fontSize: 16,
    color: colors.ink,
  },
  inputSecure: {
    paddingRight: 48,
  },
  bad: {
    borderColor: colors.atext,
  },
  eye: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  error: {
    flex: 1,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
  },
  success: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  hint: {
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
  },
});
