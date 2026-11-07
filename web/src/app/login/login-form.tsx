"use client";

import { ArrowRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Field } from "@/components/field";
import { Swap } from "@/components/swap";
import { Button } from "@/components/ui/button";
import { loginAction, type LoginState } from "@/lib/actions";

export function LoginForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  // Controlled, so a failed attempt keeps what was typed. React resets uncontrolled fields after an action.
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const invalid = Boolean(state?.error);

  return (
    <form action={action} className="mt-6 grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
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
          <Link href="/forgot-password" className="mb-1 text-sm leading-5 text-muted-foreground underline">
            Forgot password?
          </Link>
        }
      />
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm leading-5">
        <input
          type="checkbox"
          name="remember"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="size-5 shrink-0 cursor-pointer rounded accent-foreground"
        />
        <span>
          Keep me signed in
          <span className="block text-xs leading-4 text-muted-foreground">
            For 30 days. Leave off on a shared computer.
          </span>
        </span>
      </label>
      {state?.error ? (
        <p id="login-error" className="flex items-center gap-1 text-sm leading-5 text-brand-text" role="alert">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        <Swap
          index={pending ? 1 : 0}
          items={[
            <>
              Log in
              <ArrowRight strokeWidth={1.5} />
            </>,
            "Logging in",
          ]}
        />
      </Button>
    </form>
  );
}
