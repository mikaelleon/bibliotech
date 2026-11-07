/**
 * Small blocklist of throwaway email providers. Not exhaustive: it raises the cost of farming
 * Guest accounts, together with the sign-up rate limit. Copy of web/src/lib/disposable-domains.ts; keep them in step.
 */
const domains = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "33mail.com",
  "dispostable.com",
  "discard.email",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "inboxbear.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "moakt.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.dev",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  if (!domain) return false;
  // Match the domain and any subdomain of a listed domain.
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (domains.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

export const disposableMessage = "Use a permanent email address. Temporary inboxes can't verify an account.";
