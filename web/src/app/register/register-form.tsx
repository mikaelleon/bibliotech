"use client";

import { ArrowRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/field";
import { Swap } from "@/components/swap";
import { Button } from "@/components/ui/button";
import { registerAction, type RegisterState } from "@/lib/actions";
import { emailPattern, passwordProblem } from "@/lib/auth-rules";

export function RegisterForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerAction, null);
  const [name, setName] = useState(state?.values?.name ?? "");
  const [email, setEmail] = useState(state?.values?.email ?? "");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  function mark(field: keyof typeof touched) {
    return () => {
      setTouched((current) => ({ ...current, [field]: true }));
    };
  }

  const showName = submitted || touched.name;
  const showEmail = submitted || touched.email;
  const showPassword = submitted || touched.password;
  const nameError = showName && !name.trim() ? "Enter a display name." : undefined;
  const emailStillRejected =
    state?.errors?.email && state.values?.email === email.trim() ? state.errors.email : undefined;
  const emailError =
    emailStillRejected ??
    (showEmail && !emailPattern.test(email.trim()) ? "Enter a valid email, like name@example.com." : undefined);
  const passwordError = showPassword ? (passwordProblem(password) ?? undefined) : undefined;
  const termsError = submitted && !terms ? "Agree to the Terms and Conditions and Privacy Policy." : state?.errors?.terms;

  return (
    <form
      action={action}
      className="mt-6 grid gap-4"
      onSubmit={(event) => {
        setSubmitted(true);
        if (!terms) event.preventDefault();
      }}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        label="Display name"
        name="name"
        autoComplete="name"
        value={name}
        onChange={setName}
        onBlur={mark("name")}
        error={nameError}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        onBlur={mark("email")}
        error={emailError}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        onBlur={mark("password")}
        hint="At least 8 characters."
        error={passwordError}
      />
      <label className="flex items-start gap-3 text-sm leading-5">
        <input
          type="checkbox"
          name="terms"
          checked={terms}
          onChange={(event) => setTerms(event.target.checked)}
          className="mt-0.5 size-4"
        />
        <span>
          I agree to the <Link href="/terms" className="text-brand-text underline">Terms and Conditions</Link> and{" "}
          <Link href="/privacy" className="text-brand-text underline">Privacy Policy</Link>.
        </span>
      </label>
      {termsError ? (
        <p className="flex items-center gap-1 text-sm leading-5 text-brand-text" role="alert">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {termsError}
        </p>
      ) : null}
      {state?.errors?.form ? (
        <p className="flex items-center gap-1 text-sm leading-5 text-brand-text" role="alert">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {state.errors.form}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        <Swap
          index={pending ? 1 : 0}
          items={[
            <>
              Create account
              <ArrowRight strokeWidth={1.5} />
            </>,
            "Creating account",
          ]}
        />
      </Button>
    </form>
  );
}
