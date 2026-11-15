"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Dialog } from "@/components/dialog";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { deleteUser, sendUserPasswordReset, setUserDisabled, setUserRole } from "@/lib/admin-actions";

type UserEditorProps = {
  id: string;
  disabled: boolean;
  name: string;
  email: string;
  role: "user" | "admin";
  tier: string;
  verifiedAt: string | null;
  downloadsUsed: number;
  downloadLimit: number;
  resetsAt: string | null;
  favorites: number;
  libraryItems: number;
  self: boolean;
  lastAdmin: boolean;
};

/** Review and the danger section. Writes arrive in Phase 2, and the safeguards are already visible. */
export function UserEditor({
  id,
  disabled: accountDisabled,
  name,
  email,
  role,
  tier,
  verifiedAt,
  downloadsUsed,
  downloadLimit,
  resetsAt,
  favorites,
  libraryItems,
  self,
  lastAdmin,
}: UserEditorProps) {
  const [open, setOpen] = useState(false);
  const [nextRole, setNextRole] = useState<"user" | "admin">(role);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function run(task: () => Promise<{ ok: boolean; error?: string }>, done: string, after?: () => void) {
    setNotice(null);
    setActionError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) {
        setActionError(result.error ?? "Something went wrong. Try again.");
        return;
      }
      setNotice(done);
      after?.();
      router.refresh();
    });
  }

  function saveRole() {
    setRoleError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setUserRole(id, nextRole);
      if (!result.ok) {
        setRoleError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }
  const blocked = self || lastAdmin;
  const blockReason = self
    ? "You cannot delete, disable, or demote your own account."
    : "The last administrator cannot be removed or demoted.";

  return (
    <div className="grid max-w-[640px] gap-6">
      <section className="rounded-xl bg-card p-8" aria-labelledby="edit-user">
        <h2 id="edit-user" className="text-xl leading-7 font-medium">
          Account
        </h2>
        <div className="mt-4 grid gap-4">
          <Field label="Display name" name="name" defaultValue={name} />
          <Field label="Email" name="email" value={email} readOnly />
          <label className="grid gap-2 text-sm leading-5" htmlFor="role">
            Role
            <Select
              id="role"
              name="role"
              value={nextRole}
              onChange={(event) => setNextRole(event.target.value === "admin" ? "admin" : "user")}
              disabled={blocked}
            >
              <option value="user">Reader</option>
              <option value="admin">Administrator</option>
            </Select>
          </label>
          {blocked ? <p className="text-sm leading-5 text-muted-foreground">{blockReason}</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={saveRole} disabled={blocked || pending || nextRole === role}>
            {pending ? "Saving" : "Save role"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => sendUserPasswordReset(id), "Password reset email sent.")}
          >
            Send password reset
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={self || pending}
            onClick={() =>
              run(() => setUserDisabled(id, !accountDisabled), accountDisabled ? "Account enabled." : "Account disabled.")
            }
          >
            {accountDisabled ? "Enable account" : "Disable account"}
          </Button>
        </div>
        {actionError ? (
          <p role="alert" className="mt-4 text-sm leading-5 text-brand-text">
            {actionError}
          </p>
        ) : notice ? (
          <p role="status" className="mt-4 text-sm leading-5 text-muted-foreground">
            {notice}
          </p>
        ) : null}
        {roleError ? (
          <p role="alert" className="mt-4 text-sm leading-5 text-brand-text">
            {roleError}
          </p>
        ) : saved ? (
          <p role="status" className="mt-4 text-sm leading-5 text-muted-foreground">
            Role saved.
          </p>
        ) : null}
        {accountDisabled ? (
          <p className="mt-4 text-sm leading-5 text-muted-foreground">
            This account is disabled. It cannot sign in. A session that is already open ends within the hour.
          </p>
        ) : null}
      </section>
      <section className="rounded-xl bg-card p-8" aria-labelledby="usage">
        <h2 id="usage" className="text-xl leading-7 font-medium">
          Usage
        </h2>
        <dl className="mt-4 grid gap-3 text-sm leading-5">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{tier}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email verified</dt>
            <dd>{verifiedAt ? shortDate(verifiedAt) : "Not verified"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Downloads this month</dt>
            <dd>{role === "admin" ? "Not allowed" : `${downloadsUsed} of ${downloadLimit}`}</dd>
          </div>
          {role !== "admin" && resetsAt ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Resets on</dt>
              <dd>{shortDate(resetsAt)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Favorites</dt>
            <dd>{favorites}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Library items</dt>
            <dd>{libraryItems}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Ratings</dt>
            <dd>Not recorded</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-xl bg-card p-8" aria-labelledby="danger">
        <h2 id="danger" className="text-xl leading-7 font-medium">
          Delete account
        </h2>
        {blocked ? (
          <p className="mt-4 text-sm leading-5 text-muted-foreground">{blockReason}</p>
        ) : (
          <>
            <p className="mt-4 text-sm leading-5 text-muted-foreground">
              This removes the account, favorites, and library items. Download records stay, with the person detached, so the statistics remain accurate.
            </p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
              Delete account
            </Button>
            <Dialog
              open={open}
              onOpenChange={setOpen}
              title={`Delete ${name}?`}
              footer={
                <>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => deleteUser(id),
                        "Account deleted.",
                        () => {
                          setOpen(false);
                          router.push("/admin/users");
                        },
                      )
                    }
                  >
                    {pending ? "Deleting" : "Delete"}
                  </Button>
                </>
              }
            >
              <p>
                This removes {email}, their favorites, and their library items. Download records stay for analytics.
              </p>
              {actionError ? (
                <p role="alert" className="mt-2 text-sm leading-5 text-brand-text">
                  {actionError}
                </p>
              ) : null}
            </Dialog>
          </>
        )}
      </section>
    </div>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
