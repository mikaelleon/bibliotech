import { ArrowRight, CircleAlert } from "lucide-react-native";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { Wordmark } from "@/components/Wordmark";
import { useSession } from "@/lib/session";
import { colors, font } from "@/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit() {
    setBusy(true);
    const message = login(email, password);
    if (message) {
      setError(message);
      setBusy(false);
      return;
    }
    router.replace("/browse");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} style={styles.flex}>
          <Wordmark />
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.lede}>Pick up where you left off.</Text>
          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              email
              autoComplete="email"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="current-password"
            />
            {error ? (
              <View accessibilityRole="alert" style={styles.errorRow}>
                <CircleAlert color={colors.atext} size={16} strokeWidth={1.5} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
            <Button label="Log in" full busy={busy} onPress={onSubmit} icon={<ArrowRight />} />
          </View>
          <Text accessibilityRole="link" onPress={() => router.push("/forgot-password" as unknown as Href)} style={styles.switch}>
            Forgot password
          </Text>
          <Text style={styles.switch}>
            New here?{" "}
            <Text accessibilityRole="link" onPress={() => router.push("/register")} style={styles.inline}>
              Create an account
            </Text>
          </Text>
          <Button
            label="Continue as guest"
            variant="link"
            onPress={() => {
              continueAsGuest();
              router.replace("/browse");
            }}
            style={styles.guest}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    marginTop: 32,
    fontFamily: font.serif,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.32,
    color: colors.ink,
  },
  lede: {
    marginTop: 8,
    fontFamily: font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  form: {
    marginTop: 24,
    gap: 16,
  },
  errorRow: {
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
  switch: {
    marginTop: 24,
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  inline: {
    fontFamily: font.medium,
    color: colors.atext,
    textDecorationLine: "underline",
  },
  guest: {
    marginTop: 4,
  },
});
