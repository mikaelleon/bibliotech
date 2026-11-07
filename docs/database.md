# Database

Phase 1 has no live database. The web app stores accounts in `web/data/users.json` and library rows in `web/data/library.json` and `web/data/favorites.json`. Those files are a local stand-in so the screens can run. The migration below is the contract for a later Supabase project. It is not applied by the app.

`supabase/migrations/002_admin_and_library.sql` is additive. It expects these tables to exist already:

| Table | Columns this migration uses |
|---|---|
| `profiles` | `id` (uuid, matches `auth.users.id`), `display_name`, `role`, `created_at` |
| `books` | `id`, `title`, `category` |
| `downloads` | `user_id` (nullable for a guest), `book_id`, `created_at` |
| `favorites` | `user_id`, `book_id` (not created here) |

The migration adds:

- `library_items (user_id, book_id, created_at)` with primary key `(user_id, book_id)`. Row security lets a signed-in user read and write only their own rows.
- `is_admin()`, a stable security-definer function. It is true when `auth.uid()` has `profiles.role = 'admin'`.
- Select policies so an admin can read `profiles` and `downloads`.
- `admin_stats()` and `admin_list_users(search, lim, off)`. Both raise `not allowed` when `is_admin()` is false. Execute is revoked from `anon` and `public` and granted to `authenticated`. Emails are returned only by `admin_list_users`.
- A column revoke on `profiles.role` plus a restrictive update policy so a user cannot change their own role.

`supabase/dev-seed.sql` holds commented statements only. Paste them by hand to promote an account and to insert sample favorites and library rows. Do not put a service-role key in client code or in git.

Until that database exists, the server repeats the same checks in process: admin pages read the session role, library and favorites are filtered by the signed-in email, and profile updates never write `role`.

`supabase/migrations/003_admin_support.sql` replaces the two admin functions and adds a third. It does not edit `002`. Apply `002` first, then `003`.

- `admin_stats()` keeps the same counts and adds `downloadsPerDay`: one object per day for the last 30 days, including days with zero downloads.
- `admin_list_users` adds `total_count`, the number of matches before limit and offset. The return type changed, so `003` drops the old function before creating it.
- `admin_list_downloads(lim, off)` returns a user label (display name, email, or "Guest" for a missing or anonymous user), the book title, the download time, and `total_count`.
- Execute on all three is revoked from `anon` and `public` and granted to `authenticated`. Each function still raises `not allowed` when `is_admin()` is false.

The role revoke and the restrictive update policy stay in `002`. `003` does not weaken them. None of these files run on their own.
