# API

Next.js route handlers under `web/src/app/api/`. Both apps call the same endpoints.

**Auth.** The web app sends its Supabase cookies. The Android app sends `Authorization: Bearer <access_token>` (the Supabase session's access token). The server verifies the JWT with `getClaims()` and takes the user id only from it.

**Errors.** Every error uses one shape:

```json
{ "error": { "code": "COOLDOWN", "message": "Wait 42 seconds before sending another link.", "retryAfterSeconds": 42 } }
```

Responses carry `Cache-Control: no-store`.

## GET /api/me

The caller's account and current quota period.

```http
GET /api/me
Authorization: Bearer eyJ...
```

```json
{
  "id": "6f1c...",
  "email": "reader@example.com",
  "name": "Reader",
  "role": "user",
  "tier": "guest",
  "verified": false,
  "used": 2,
  "limit": 5,
  "periodStart": "2026-11-07T14:30:12+00:00",
  "resetsAt": "2026-12-07T14:30:12+00:00"
}
```

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | No valid session or token |
| 500 | `ACCOUNT_UNAVAILABLE` | Profile or quota could not be read |

## POST /api/auth/send-verification

Emails a one-time verification link to the caller's address. No body.

```json
{ "status": "sent", "message": "Link sent. Check your inbox." }
```

`status` is `sent` or `already_verified`.

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Not signed in |
| 429 | `COOLDOWN` | A link was sent in the last 60 seconds (`retryAfterSeconds`) |
| 429 | `DAILY_LIMIT` | Five links in the last 24 hours |
| 429 | `RATE_LIMITED` | More than 20 requests an hour from one address |
| 400 | `NO_EMAIL` | The account has no email |
| 502 | `SEND_FAILED` | The email service refused; the attempt does not count |

Links expire after 24 hours and work once. Only the SHA-256 hash of the token is stored. Without `RESEND_API_KEY` in development, the link is printed to the server console.

## GET /api/auth/verify?token=...

The link in the email. Works without being signed in. Uses the token once, then redirects (303) to `/verify-email?status=<status>`:

| status | Meaning |
|---|---|
| `verified` | The account is now Registered (10 a month) |
| `already_verified` | Nothing changed |
| `used` | The link was used before |
| `expired` | Older than 24 hours |
| `email_changed` | The account's email changed after the link was sent |
| `invalid` | Unknown or malformed token |
| `error` | Server problem |
