import { ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, continueAsGuest } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit() {
    setSubmitted(true);
    setBusy(true);
    const displayName = name.trim();
    const nextName = displayName ? "" : "Enter a display name.";
    const nextEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? ""
      : "Enter a valid email, like name@example.com.";
    const nextPassword = password.length >= 8 ? "" : "Use at least 8 characters.";
    setNameError(nextName);
    setEmailError(nextEmail);
    setPasswordError(nextPassword);
    setFormError("");
    if (nextName || nextEmail || nextPassword) {
      setBusy(false);
      return;
    }
    const message = await register(name, email, password);
    if (message) {
      setFormError(message);
      if (message.includes("email")) setEmailError(message);
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
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.lede}>Free. Start with 5 downloads, and 10 once you verify your email. Plus a library and favorites.</Text>
          <View style={styles.form}>
            <Field
              label="Display name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              error={submitted ? nameError : ""}
              success={!nameError && name.trim() ? "Looks good." : ""}
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              email
              autoComplete="email"
              error={submitted ? emailError : ""}
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secure
              autoComplete="new-password"
              error={submitted ? passwordError : ""}
              hint="At least 8 characters."
            />
            {formError && !emailError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {formError}
              </Text>
            ) : null}
            <Button label="Create account" full busy={busy} onPress={onSubmit} icon={<ArrowRight />} />
          </View>
          <Text style={styles.switch}>
            Already have an account?{" "}
            <Text accessibilityRole="link" onPress={() => router.push("/login")} style={styles.inline}>
              Log in
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
    marginTop: 24,
    fontFamily: font.title,
    fontSize: 28,
    lineHeight: 36,
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
  error: {
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
