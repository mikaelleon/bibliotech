# Database

The hosted Supabase project is `bibliotech` (ref `nsusvjlticyuxrshgusg`), linked with `supabase link`. The apps still read `web/data/*.json` until auth and data move to Supabase in Phase 2 step 0. Migrations apply in version order: `001`, `002`, `003`, then timestamped files from `supabase migration new`.

Apply to the hosted project:

```bash
supabase db push --remote --dry-run
supabase db push --remote
```

`supabase/migrations/001_base_schema.sql` creates the base tables:

| Table | Columns | Client access |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `display_name`, `role` (`user` or `admin`), `created_at` | Select own row; update `display_name` only. Created by the `on_auth_user_created` trigger |
| `books` | `id`, `title`, `author`, `category`, `language`, `published`, `license`, `source_name`, `source_url`, `summary`, `summary_short`, `cover_url`, timestamps | Select for everyone, including visitors. Writes use the secret key on the server |
| `downloads` | `id`, `user_id` (nullable), `book_id`, `created_at` | Select own rows. No client writes; Phase 2 adds `request_download()` |
| `favorites` | `user_id`, `book_id`, `created_at` | Select, insert, delete own rows |

Every table revokes the default `anon` and `authenticated` privileges and grants back only the access above. `handle_new_user()` is `security definer` with `search_path = ''` and reads only `display_name` from user metadata, so a client cannot sign up as an admin.

`supabase/migrations/002_admin_and_library.sql` adds:

- `library_items (user_id, book_id, created_at)` with primary key `(user_id, book_id)`. Row security lets a signed-in user read and write only their own rows.
- `is_admin()`, a stable security-definer function. It is true when `auth.uid()` has `profiles.role = 'admin'`.
- Select policies so an admin can read `profiles` and `downloads`.
- `admin_stats()` and `admin_list_users(search, lim, off)`. Both raise `not allowed` when `is_admin()` is false. Execute is revoked from `anon` and `public` and granted to `authenticated`. Emails are returned only by `admin_list_users`.
- A column revoke on `profiles.role` plus a restrictive update policy so a user cannot change their own role.

`supabase/dev-seed.sql` holds commented statements only. To make the first admin, sign up in the app, then run the promote statement in the SQL editor. Paste them by hand to promote an account and to insert sample favorites and library rows. Do not put a service-role key in client code or in git.

Until the apps move to Supabase, the server repeats the same checks in process: admin pages read the session role, library and favorites are filtered by the signed-in email, and profile updates never write `role`.

Known follow-ups for the Phase 2 migration: `library_items` (from `002`) keeps the default `anon` grant, though RLS still blocks anon rows; and `is_admin()` plus the admin RPCs use `search_path = public` instead of `''`.

`supabase/migrations/003_admin_support.sql` replaces the two admin functions and adds a third. It does not edit `002`. Apply `002` first, then `003`.

- `admin_stats()` keeps the same counts and adds `downloadsPerDay`: one object per day for the last 30 days, including days with zero downloads.
- `admin_list_users` adds `total_count`, the number of matches before limit and offset. The return type changed, so `003` drops the old function before creating it.
- `admin_list_downloads(lim, off)` returns a user label (display name, email, or "Guest" for a missing or anonymous user), the book title, the download time, and `total_count`.
- Execute on all three is revoked from `anon` and `public` and granted to `authenticated`. Each function still raises `not allowed` when `is_admin()` is false.

The role revoke and the restrictive update policy stay in `002`. `003` does not weaken them.

`supabase/migrations/20261107140322_catalog_slugs.sql` adds `books.slug` (unique, lowercase words joined by hyphens, not null) and loads the 19 Phase 1 books. The apps address books by slug, so `library_items` and `favorites` rows join `books` to read it.

`supabase/migrations/20261107141845_email_verified_at.sql` adds `profiles.email_verified_at`. Null means the Guest tier; set means Registered. Only the server writes it.

`supabase/migrations/20261107142501_quota_and_verification.sql`:

| Object | What it does | Who can call or read it |
|---|---|---|
| `quota_limits (tier, max_books)` | `guest = 5`, `registered = 10`. The only place the limits live | No client access |
| `account_tier(uid)` | `admin`, `registered` (email verified) or `guest` | Server functions only |
| `quota_period(anchor, now)` | Monthly window from the registration time, in UTC. Months are added to the anchor itself, so Jan 31 renews Feb 28 (or 29), then Mar 31 | `authenticated`, `service_role` |
| `quota_status(uid)` | `{ tier, used, limit, periodStart, resetsAt }`. `used` = books first downloaded in the current period | `service_role` |
| `my_quota()` | `quota_status` for the caller (`auth.uid()`); never takes an id | `authenticated` |
| `downloads` | Reshaped: one row per (user, book) with `first_downloaded_at`, `last_downloaded_at`, `times_downloaded`, `last_device_label` | Select own rows (admins: all). No client writes |
| `request_download(user, book, device, confirm_repeat)` | The only writer of `downloads`. Per-user advisory lock; statuses `forbidden`, `not_found`, `not_available`, `already_downloaded`, `repeat_ok`, `quota_exceeded`, `ok` | `service_role` |
| `email_verifications` | One row per link: SHA-256 `token_hash`, `email`, `expires_at`, `used_at` | No client access |
| `verify_email_token(hash)` | Checks and uses a token in one transaction; sets `email_verified_at`. Statuses `verified`, `already_verified`, `invalid`, `used`, `expired`, `email_changed` | `service_role` |
| Trigger `on_auth_user_email_changed` | A changed email clears `email_verified_at` and voids open links | Runs on `auth.users` |
| `admin_stats()` | Adds `guestUsers` and `repeatDownloads`; per-day counts use `first_downloaded_at` | `authenticated`, refuses non-admins |
| `admin_list_users(search, lim, off)` | Adds `email_verified_at`, `tier`, `downloads_used` (this period), `download_limit`, `resets_at` | `authenticated`, refuses non-admins |
| `admin_list_downloads(lim, off)` | One row per (user, book) with first and last dates and `times_downloaded` | `authenticated`, refuses non-admins |

It also removes the `anon` grant on `library_items` and recreates `is_admin()` with `search_path = ''`. Every function in it uses `search_path = ''`.
