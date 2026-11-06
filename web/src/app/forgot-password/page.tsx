import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { Wordmark } from "@/components/wordmark";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-12 pb-16 md:pt-16">
      <Wordmark />
      <ForgotPasswordForm />
    </main>
  );
}
