"use client";

import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { updateNameAction } from "@/lib/actions";

export function AccountPanel({ name, email }: { name: string; email: string }) {
  const { toast } = useToast();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    const message = await updateNameAction(value);
    setPending(false);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    toast("Display name saved.");
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6" aria-labelledby="account-heading">
      <h2 id="account-heading" className="text-xl leading-7 font-medium">
        Account
      </h2>
      <label className="mt-4 grid gap-2 text-sm leading-5" htmlFor="display-name">
        Display name
        <input
          id="display-name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-base"
        />
      </label>
      {error ? <p className="mt-2 text-sm leading-5 text-brand-text">{error}</p> : null}
      <Button type="button" className="mt-4" onClick={() => void save()} disabled={pending}>
        {pending ? "Saving" : "Save"}
      </Button>
      <p className="mt-6 text-sm leading-5 text-muted-foreground">Email</p>
      <p className="text-sm leading-5 text-muted-foreground">{email}</p>
    </section>
  );
}
