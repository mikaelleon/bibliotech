"use client";

import { ArrowRight } from "lucide-react";
import { useActionState, useState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { registerAction, type RegisterState } from "@/lib/actions";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterForm() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerAction, null);
  const [name, setName] = useState(state?.values?.name ?? "");
  const [email, setEmail] = useState(state?.values?.email ?? "");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? "Enter a display name." : undefined;
  const emailStillRejected =
    state?.errors?.email && state.values?.email === email.trim() ? state.errors.email : undefined;
  const emailError =
    emailStillRejected ??
    (submitted && !emailPattern.test(email.trim()) ? "Enter a valid email, like name@example.com." : undefined);
  const passwordError = submitted && password.length < 8 ? "Use at least 8 characters." : undefined;

  return (
    <form
      action={action}
      className="mt-6 grid gap-4"
      onSubmit={() => setSubmitted(true)}
    >
      <Field
        label="Display name"
        name="name"
        autoComplete="name"
        value={name}
        onChange={setName}
        error={submitted ? nameError : undefined}
        success={name.trim() ? "Looks good." : undefined}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        error={emailError}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hint="At least 8 characters."
        error={passwordError}
      />
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Creating account" : "Create account"}
        {pending ? null : <ArrowRight strokeWidth={1.5} />}
      </Button>
    </form>
  );
}
