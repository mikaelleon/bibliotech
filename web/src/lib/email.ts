import "server-only";

export type Email = { to: string; subject: string; text: string; html: string };

export type SendResult = { ok: true; dev?: boolean } | { ok: false };

/**
 * Sends through the Resend HTTP API (RESEND_API_KEY, EMAIL_FROM). Without a key, development
 * prints the message to the server console so the flow can be tested; production refuses.
 * Never logs the message body in production: it carries one-time links.
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!key || !from) {
    if (process.env.NODE_ENV === "production") {
      console.error("[email] RESEND_API_KEY or EMAIL_FROM is not set; email not sent.");
      return { ok: false };
    }
    console.info(`[email] (dev, not sent) to ${email.to}: ${email.subject}\n${email.text}`);
    return { ok: true, dev: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!response.ok) {
      console.error("[email] Resend rejected the message", response.status, await response.text().catch(() => ""));
      return { ok: false };
    }
    return { ok: true };
  } catch (error) {
    console.error("[email] Resend request failed", error);
    return { ok: false };
  }
}
