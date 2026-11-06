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
