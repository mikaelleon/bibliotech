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
