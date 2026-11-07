"use client";

import { ArrowRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "@/lib/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const invalid = Boolean(state?.error);

  return (
    <form action={action} className="mt-6 grid gap-4">
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        invalid={invalid}
        describedBy={invalid ? "login-error" : undefined}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        invalid={invalid}
        describedBy={invalid ? "login-error" : undefined}
        aside={
          <Link href="/forgot-password" className="mb-1 text-sm leading-5 text-brand-text underline">
            Forgot password
          </Link>
        }
      />
      {state?.error ? (
        <p id="login-error" className="flex items-center gap-1 text-sm leading-5 text-brand-text" role="alert">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Logging in" : "Log in"}
        {pending ? null : <ArrowRight strokeWidth={1.5} />}
      </Button>
    </form>
  );
}
