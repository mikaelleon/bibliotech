// Transactional email layout using the design tokens in design/tokens.md.
// Inline styles for client support; a <style> block adds dark mode where honored.

const FONT = "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function verifyEmailHtml(link: string): string {
  const href = esc(link);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Verify your email for Bibliotech</title>
<style>
  @media (prefers-color-scheme: dark) {
    .bg { background-color: #14161D !important; }
    .card { background-color: #1C1F28 !important; border-color: #2E313C !important; }
    .ink { color: #ECECEA !important; }
    .muted { color: #A3A3A0 !important; }
    .btn { background-color: #ECECEA !important; }
    .btn a { color: #14161D !important; }
    .atext { color: #F0807F !important; }
    .rule { border-color: #2E313C !important; }
  }
  @media (max-width: 480px) { .card { padding: 24px !important; } }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background-color:#F6F6F5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Verify your email to raise your download limit from 5 to 10 a month.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background-color:#F6F6F5;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
      <tr><td style="padding:0 0 16px 4px;font-family:${FONT};font-size:20px;line-height:28px;font-weight:600;color:#1F2330;" class="ink">
        Bibliotech<span style="color:#E2504F;">.</span>
      </td></tr>
      <tr><td class="card" style="background-color:#FFFFFF;border:1px solid #E4E4E2;border-radius:12px;padding:32px;font-family:${FONT};">
        <h1 class="ink" style="margin:0 0 16px 0;font-family:${FONT};font-size:24px;line-height:32px;font-weight:600;color:#1F2330;">Verify your email</h1>
        <p class="ink" style="margin:0 0 24px 0;font-size:16px;line-height:24px;color:#1F2330;">Confirm your address to raise your download limit from 5 to 10 a month.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
          <tr><td class="btn" align="center" style="background-color:#20232F;border-radius:999px;">
            <a href="${href}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;line-height:20px;font-weight:500;color:#FFFFFF;text-decoration:none;border-radius:999px;">Verify my email</a>
          </td></tr>
        </table>
        <p class="muted" style="margin:0 0 8px 0;font-size:14px;line-height:20px;color:#63646B;">The link works once and expires in 24 hours.</p>
        <p class="muted" style="margin:0;font-size:14px;line-height:20px;color:#63646B;">If you didn't create an account, ignore this email.</p>
        <hr class="rule" style="border:0;border-top:1px solid #E4E4E2;margin:24px 0 16px 0;">
        <p class="muted" style="margin:0 0 4px 0;font-size:12px;line-height:16px;color:#63646B;">Button not working? Paste this link into your browser:</p>
        <p style="margin:0;font-size:12px;line-height:16px;word-break:break-all;"><a class="atext" href="${href}" style="color:#C23B3E;text-decoration:underline;">${href}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
