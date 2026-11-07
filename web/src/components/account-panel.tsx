"use client";

import { useState } from "react";

import { Field } from "@/components/field";
import { SaveLabel, useSavedFlash } from "@/components/save-label";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { updateNameAction } from "@/lib/actions";

export function AccountPanel({ name, email }: { name: string; email: string }) {
  const { toast } = useToast();
  const { saved, flash } = useSavedFlash();
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
    flash();
  }

  return (
    <section className="rounded-xl bg-card p-8" aria-labelledby="account-heading">
      <h2 id="account-heading" className="text-xl leading-7 font-medium">
        Account
      </h2>
      <div className="mt-4 grid gap-4">
        <Field label="Display name" name="displayName" value={value} onChange={setValue} error={error ?? undefined} />
        <Field label="Email" name="email" value={email} readOnly />
      </div>
      <Button type="button" className="mt-4" onClick={() => void save()} disabled={pending}>
        <SaveLabel pending={pending} saved={saved} idle="Save" busy="Saving" done="Saved" />
      </Button>
    </section>
  );
}
