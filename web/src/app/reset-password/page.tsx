import { ResetPasswordForm } from "@/components/reset-password-form";
import { Wordmark } from "@/components/wordmark";
import { readResetToken } from "@/lib/reset-token";

// The token sits in the URL; keep it out of Referer headers sent to other sites.
export const metadata = { title: "Choose a new password", referrer: "no-referrer" as const };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const valid = Boolean(await readResetToken(params.token));

  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      {valid ? (
        <>
          <h1 className="page-title mt-8">Choose a new password</h1>
          <p className="mt-2 text-base leading-6 text-muted-foreground">
            Use 8 or more characters. This link works once and expires 30 minutes after it was sent.
          </p>
        </>
      ) : null}
      <ResetPasswordForm token={valid ? (params.token ?? null) : null} />
    </main>
  );
}
