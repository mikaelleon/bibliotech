import { LogOut } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { LockedPanel } from "@/components/LockedPanel";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { useSession } from "@/lib/session";
import { quotaFor, quotaNote } from "@/lib/quota";
import { colors, font, radius } from "@/theme/tokens";

export default function ProfileScreen() {
  const router = useRouter();
  const { session, logout, rename, changePassword } = useSession();
  const [name, setName] = useState(session.kind === "user" ? session.name : "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  if (session.kind !== "user") return <LockedPanel title="Profile" />;

  const quota = quotaFor(session);
  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 0;
  const width = `${limit ? Math.max(0, Math.min(100, (used / limit) * 100)) : 0}%` as const;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.lede}>Your account, downloads, and session.</Text>
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
          onPress={async () => {
            const message = await rename(name);
            setNameError(message);
            setSaved(message ? null : "Display name saved.");
          }}
        />
        <Text style={styles.label}>Email</Text>
        <Text style={styles.note}>{session.email}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.usage}>Downloads</Text>
        <Text style={styles.note}>{session.verified ? "Verified account" : "Guest, email not verified"}</Text>
        <Text style={styles.meterText}>{used} of {limit} downloads used this month</Text>
        <View accessibilityElementsHidden style={styles.track}>
          <View style={[styles.fill, { width }]} />
        </View>
        {quota ? <Text style={styles.note}>{quotaNote(quota)}</Text> : null}
        <View style={styles.actions}>
          <Button label="Download history" href={"/downloads" as Href} variant="outline" />
        </View>
      </View>
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
          variant="outline"
          onPress={async () => {
            const message = await changePassword(password, confirm);
            setPasswordError(message);
            if (!message) {
              setPassword("");
              setConfirm("");
              setSaved("Password updated.");
            }
          }}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.usage}>Session</Text>
        <Button
          label="Log out"
          variant="outline"
          icon={<LogOut />}
          iconPosition="start"
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
        />
      </View>
      {saved ? <Text accessibilityRole="alert" style={styles.saved}>{saved}</Text> : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  title: {
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
    color: colors.ink,
  },
  lede: {
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
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
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: 32,
  },
  actions: {
    marginTop: 16,
    gap: 12,
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
  meterText: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  track: {
    height: 4,
    width: 128,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    backgroundColor: colors.accent,
  },
});
