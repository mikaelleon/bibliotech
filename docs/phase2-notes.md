# Phase 2 notes

Running log of decisions, deviations from `docs/prompts/phase2-implementation.md`, **[CONFIRM]** items and **[SPIKE]** results.

## Decisions

- **Quota period (2026-11-07):** the quota renews monthly, anchored on the account's registration timestamp (`profiles.created_at`). Short months clamp to their last day. Books first downloaded in earlier periods stay in history and re-download free. Added to the prompt (rules 2, 3, 5; sections 4.1, 4.6, 5, 6; tests 2a).

## Checkpoint 0: Supabase foundation

Status: code done, typecheck, lint and web build pass. **Not run against the live database yet**: migrations are not pushed (the CLI requires explicit consent for hosted changes).

### What replaced what (audit)

| Phase 1 piece | Replaced by |
|---|---|
| `web/src/lib/users.ts` (scrypt hashes in `web/data/users.json`) | Supabase Auth (`signUp`, `signInWithPassword`, `updateUser`) |
| `web/src/lib/session-token.ts` (HMAC cookie, `SESSION_SECRET`) | Supabase auth cookies through `@supabase/ssr`; `web/src/lib/session.ts` reads them with `getClaims()` |
| `web/src/lib/reset-token.ts` (signed reset links, console delivery) | `resetPasswordForEmail` plus `web/src/app/auth/callback/route.ts` (PKCE code exchange) |
| `web/src/lib/records.ts` on `web/data/library.json`, `favorites.json` | Same module on `library_items` and `favorites`, RLS-limited to the owner |
| `web/src/lib/admin.ts` reading the JSON user list | `admin_stats`, `admin_list_users`, `admin_list_downloads` RPCs (called as the signed-in admin) |
| `web/src/proxy.ts` checking the HMAC cookie | Supabase session refresh plus the same redirect rules |
| `android/lib/users.ts` in-memory accounts | Supabase Auth; the file keeps only form rules and the login throttle |
| `android/lib/session.tsx` SecureStore session and shelves | `android/lib/supabase.ts` (`LargeSecureStore`, AppState auto-refresh) and Supabase-backed shelves |
| `web/data/*.json` | Deleted |

### Deviations

- **Books by slug.** The app still reads the catalog from `web/src/lib/books.ts` and `android/lib/books.ts` and addresses books by slug. Migration `20261107140322_catalog_slugs.sql` adds `books.slug` and loads those 19 books so shelf rows have real foreign keys. The importer (checkpoint 4) moves the catalog to the database.
- **"Continue as guest" kept as a visitor flag.** `Session.kind === "guest"` now means a visitor without an account (unsigned `elib_visitor` cookie on web, a SecureStore flag on Android). It grants only public pages. Step 2 renames it to visitor when Guest becomes an unverified account.
- **"Keep me signed in".** Web: without it, Supabase auth cookies are written without max-age (browser-session cookies) via the `elib_short` cookie. Android: the session is signed out on the next cold start.
- **Admin user list** loads up to 1000 users through `admin_list_users` and filters and pages in the server. Step 8 moves filters and paging into SQL.
- **Admin user detail** URLs use the user id (uuid) instead of the email.
- **Android `.env`** held the web file's values, including the secret key under non-`EXPO_PUBLIC_` names. Expo does not bundle those, but the file now holds only `EXPO_PUBLIC_*` values. Rotate the secret key if that file was ever shared.

### Still to do for checkpoint 0

- Push `001`, `002`, `003` and `20261107140322_catalog_slugs.sql` (`supabase db push --remote`).
- Manual run: sign up, log in, log out, Library and Favorites add, remove and Undo, password change, reset email (the built-in sender only reaches project team members until SMTP is set).
- Android needs a new development build (`npx expo run:android`): `@react-native-async-storage/async-storage` and `react-native-get-random-values` are native modules.
- Promote the first admin with the statement in `supabase/dev-seed.sql`.

## Verified flag (ahead of checkpoint 1)

- Bug found in testing: a new, unverified account showed a limit of 10. `quotaFor` gave every account 10 because the verified state didn't exist yet.
- Migration `20261107141845_email_verified_at.sql` adds `profiles.email_verified_at` (clients can't write it). Both apps read it into `Session.verified`; `quotaFor` gives unverified accounts 5 and verified accounts 10. Sign-up copy says so.
- The sessions select `profiles.*` so sign-in keeps working before the migration is pushed (the account reads as unverified).
- Done in the next section: the verification email and link, the monthly reset, and the admin user table and page.

## Checkpoints 1, 2 and 8 (database and verification)

Migration `20261107142501_quota_and_verification.sql`, plus web and Android changes. Typecheck, lint and the web build pass. **Not run against the live database until the migrations are pushed.**

- **Quota period:** `quota_period` (UTC, anchored on `profiles.created_at`), `quota_status`, `my_quota`. Both apps read used, limit and `resetsAt` from `my_quota()` and show "Resets on {date}" (the UTC date).
- **downloads reshaped** to one row per (user, book); `request_download()` is the only writer. The download endpoint that calls it is checkpoint 3.
- **Verification:** `POST /api/auth/send-verification`, `GET /api/auth/verify`, `/verify-email` result page, `GET /api/me`. Web banner on Browse and Profile (server action); Android banner on Browse and Profile (calls the API with a Bearer token; needs `EXPO_PUBLIC_API_URL`). Android reloads the account when the app returns to the foreground.
- **Email change** clears `email_verified_at` through a trigger on `auth.users`. Neither app offers an email change yet.
- **Disposable domains** are blocked at sign-up on web (server action) and Android (client check). Android signs up directly with Supabase, so its check can be bypassed by calling Supabase directly; moving Android sign-up behind the API would close that.
- **Admin:** users table shows type (Registered, Guest (unverified), Administrator), joined date and "x of limit" for this month; the Type filter now filters by tier; the user page shows type, verified date, this month's count and reset date; the downloads table shows last download and times. Filters and paging still run in the server (up to 1000 users).
- **Limit numbers in copy:** sign-up text, banners and the email say "5" and "10" as words. Counts and limits on screen come from the database.
- **Email delivery:** needs `RESEND_API_KEY` and `EMAIL_FROM` (a domain verified in Resend). Without them, development prints the link in the server console.

## [CONFIRM]

- Instructor accepts "Guest = signed up but unverified".
- Standard Ebooks single-book downloads without an account.

## [SPIKE]

- `signUp` returns a session with Confirm email off: handled both ways in code; confirm on first run.
- `getClaims(jwt)` for Bearer tokens: checkpoint 3.
- Reader and text extraction: checkpoint 7.
