import { LogOut } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { LockedPanel } from "@/components/LockedPanel";
import { UsagePanel, useAiUsage } from "@/components/UsagePanel";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { useSession } from "@/lib/session";
import { quotaFor } from "@/lib/quota";
import { colors, font, radius } from "@/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, logout, rename, changePassword } = useSession();
  const [name, setName] = useState(session.kind === "user" ? session.name : "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState<string | null>(null);
  const ai = useAiUsage(session.kind === "user" && session.role !== "admin");
  if (session.kind !== "user") return <LockedPanel title="Profile" />;

  const quota = quotaFor(session);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Profile</Text>
      <VerifyEmailBanner />
      <View style={styles.card}>
        <Text style={styles.usage}>Account</Text>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          accessibilityLabel="Display name"
          style={styles.input}
        />
        {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
        <Button
          label="Save"
          full
          style={styles.action}
          onPress={async () => {
            const message = await rename(name);
            setNameError(message);
            setNameSaved(message ? null : "Display name saved.");
          }}
        />
        {nameSaved ? <Text accessibilityRole="alert" style={styles.saved}>{nameSaved}</Text> : null}
        <Text style={[styles.label, styles.labelSection]}>Email</Text>
        <Text style={styles.note}>{session.email}</Text>
      </View>
      {quota ? (
        <UsagePanel
          verified={session.verified}
          ai={ai}
          downloads={{ used: quota.used, limit: quota.limit, resetsAt: quota.resetsAt }}
        />
      ) : null}
      <View style={styles.card}>
        <Text style={styles.usage}>Security</Text>
        <Text style={styles.label}>New password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          accessibilityLabel="New password"
          style={styles.input}
        />
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          accessibilityLabel="Confirm password"
          style={styles.input}
        />
        {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
        <Button
          label="Update password"
          full
          style={styles.action}
          onPress={async () => {
            const message = await changePassword(password, confirm);
            setPasswordError(message);
            setPasswordSaved(null);
            if (!message) {
              setPassword("");
              setConfirm("");
              setPasswordSaved("Password updated.");
            }
          }}
        />
        {passwordSaved ? <Text accessibilityRole="alert" style={styles.saved}>{passwordSaved}</Text> : null}
      </View>
      <View style={styles.card}>
        <Text style={styles.usage}>Session</Text>
        <Button
          label="Log out"
          variant="outline"
          full
          style={styles.action}
          icon={<LogOut />}
          iconPosition="start"
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    // Clears the floating Ask AI button (44 high, 16 above the tab bar) at the end of the scroll.
    paddingBottom: 96,
    gap: 16,
  },
  action: {
    marginTop: 16,
  },
  title: {
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  labelSection: {
    marginTop: 24,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.panel,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    fontFamily: font.sans,
    fontSize: 16,
    color: colors.ink,
  },
  error: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.atext,
  },
  saved: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 24,
  },
  usage: {
    fontFamily: font.medium,
    fontSize: 20,
    lineHeight: 28,
    color: colors.ink,
  },
  note: {
    marginTop: 4,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
});
