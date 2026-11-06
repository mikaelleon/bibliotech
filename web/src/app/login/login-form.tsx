"use client";

import { ArrowRight, CircleAlert, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/lib/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="mt-6 grid gap-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
          />
          <button
            type="button"
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      {state?.error ? (
        <p className="flex items-center gap-1 text-sm leading-5 text-brand-text" role="alert">
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {state.error}
        </p>
      ) : null}
      <Link href="/forgot-password" className="text-sm leading-5 text-brand-text underline underline-offset-4">
        Forgot password
      </Link>
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Logging in" : "Log in"}
        {pending ? null : <ArrowRight strokeWidth={1.5} />}
      </Button>
    </form>
  );
}
