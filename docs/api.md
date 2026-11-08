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

## POST /api/books/:id/download

`:id` is the book slug. Starts a download for the signed-in user. Admins are refused. The body is optional:

```json
{ "deviceLabel": "Android", "confirmRepeat": false }
```

`request_download` decides the status. A new book counts against the monthly quota. A book already in the account's history does not, once `confirmRepeat` is true.

```json
{ "url": "https://…", "expiresIn": 60, "used": 3, "limit": 5, "repeat": false }
```

The URL is a signed read of the private `books` bucket. It lasts 60 seconds and cannot be revoked. If the row is written and signing then fails, the book stays in history and a retry does not use another download.

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Not signed in |
| 403 | `FORBIDDEN_ROLE` | The account is an admin |
| 403 | `QUOTA_EXCEEDED` | No downloads left this period (`used`, `limit`, `tier`, `resetsAt`) |
| 404 | `BOOK_NOT_FOUND` | No catalog row for the slug |
| 404 | `BOOK_NOT_AVAILABLE` | The row has no file |
| 404 | `ACCOUNT_NOT_FOUND` | `request_download` could not find the account |
| 409 | `ALREADY_DOWNLOADED` | Already in history; send `confirmRepeat: true` (`lastDownloadedAt`) |
| 429 | `RATE_LIMITED` | More than 30 a minute for the account, or 60 a minute for the IP |
| 500 | `FILE_UNAVAILABLE` | The history row exists but the signed URL could not be created |

## GET /api/downloads

The caller's download history, newest first.

```http
GET /api/downloads?page=1&pageSize=20
```

`pageSize` is at most 50.

```json
{
  "downloads": [
    { "id": "pride-and-prejudice", "title": "Pride and Prejudice", "author": "Jane Austen", "firstDownloadedAt": "2026-11-07T15:00:00+00:00", "lastDownloadedAt": "2026-11-07T15:00:00+00:00", "times": 1 }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Not signed in |
| 500 | `HISTORY_UNAVAILABLE` | The history could not be read |

## GET /api/books/:id/progress

Saved reading position for this account. `:id` is the slug.

```json
{ "cfi": "epubcfi(/6/2)", "progress": 0.04, "updatedAt": "2026-11-07T15:10:00+00:00" }
```

`cfi` is null when nothing has been saved. The position is a spine location (`epubcfi(/6/{n})`), not a character offset.

## PUT /api/books/:id/progress

```json
{ "cfi": "epubcfi(/6/4)", "progress": 0.08, "updatedAt": "2026-11-07T15:12:00+00:00" }
```

`cfi` is required (200 characters max). `progress` is 0 to 1. A write older than the stored `updated_at` returns `{ "saved": false }` and leaves the row.

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Not signed in |
| 400 | `INVALID_BODY` | Missing position |
| 404 | `BOOK_NOT_FOUND` | No catalog row for the slug |
| 500 | `PROGRESS_UNAVAILABLE` | The row could not be read or written |
