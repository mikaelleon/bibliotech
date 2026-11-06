import { ResetPasswordForm } from "@/components/reset-password-form";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const valid = Boolean(params.token) && params.token !== "expired";

  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      {valid ? (
        <>
          <h1 className="serif mt-8 text-[32px] leading-10 font-light">Choose a new password</h1>
          <p className="mt-2 text-base leading-6 text-muted-foreground">
            Use 8 or more characters. This page does not email a link in Phase 1.
          </p>
        </>
      ) : null}
      <ResetPasswordForm valid={valid} />
    </main>
  );
}
