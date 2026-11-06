"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  success?: string;
  onBlur?: () => void;
};

/** Label, 44px input, optional hint, and an error or success line. */
export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  defaultValue,
  value,
  onChange,
  error,
  hint,
  success,
  onBlur,
}: FieldProps) {
  const generatedId = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;
  const describedBy = error ? `${generatedId}-error` : hint ? `${generatedId}-hint` : undefined;

  return (
    <div>
      <Label htmlFor={generatedId}>{label}</Label>
      <div className="relative">
        <Input
          id={generatedId}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          defaultValue={value === undefined ? defaultValue : undefined}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(isPassword && "pr-12")}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
          </button>
        ) : null}
      </div>
      {hint ? (
        <p id={`${generatedId}-hint`} className="mt-1 text-xs leading-4 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${generatedId}-error`}
          className="mt-1 flex items-center gap-1 text-sm leading-5 text-brand-text"
          role="alert"
        >
          <CircleAlert size={16} strokeWidth={1.5} aria-hidden />
          {error}
        </p>
      ) : null}
      {success && !error ? (
        <p className="mt-1 flex items-center gap-1 text-sm leading-5 text-foreground">
          <CheckIcon />
          {success}
        </p>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
