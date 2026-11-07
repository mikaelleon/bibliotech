import { ResetPasswordForm } from "@/components/reset-password-form";
import { Wordmark } from "@/components/wordmark";
import { getSession } from "@/lib/session";

export const metadata = { title: "Choose a new password", referrer: "no-referrer" as const };

/**
 * The reset email links to /auth/callback, which signs the user in and sends them here.
 * Without that session the link has expired or was already used.
 */
export default async function ResetPasswordPage() {
  const session = await getSession();
  const valid = session.kind === "user";

  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      {valid ? (
        <>
          <h1 className="page-title mt-8">Choose a new password</h1>
          <p className="mt-2 text-base leading-6 text-muted-foreground">
            Use 8 or more characters. The link in your email works once.
          </p>
        </>
      ) : null}
      <ResetPasswordForm token={valid ? "session" : null} />
    </main>
  );
}
