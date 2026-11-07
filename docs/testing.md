# Testing notes

Checked on 7 November 2026. There is no Supabase project in this repo, so the SQL functions were not executed against Postgres. The app repeats the same checks in the Next.js server. Results below are for that server, plus a production build of `/dev/states`.

## Admin functions

`admin_stats()` and `admin_list_users()` start in `supabase/migrations/002_admin_and_library.sql`. `003_admin_support.sql` replaces them and adds `admin_list_downloads()`. Each raises `not allowed` unless `is_admin()` is true. Execute is revoked from `anon` and `public` and granted to `authenticated`.

These statements were not executed against Postgres. There is no database in this repo, so a guest or a registered user cannot be shown a live RPC rejection. The same refusal is what the Next.js server does.

In `web/src/lib/admin.ts`, `assertAdmin` throws `not allowed` before `adminStats`, `adminListUsers`, or `adminListDownloads` read anything. A guest and a registered user therefore cannot receive those results. Confirmed in the browser: both see the 403 panel on `/admin`, `/admin/books`, `/admin/users`, and `/admin/downloads`, and the Admin rail item is absent. A visitor with no cookie is redirected to `/login` by `proxy.ts` before the page renders.

## No flash of admin data

The admin layout returns the 403 panel and does not render `children` until the session role is `admin`. Each page also returns `null` before it calls an admin helper. The role comes from `users.json` on each request, not from the cookie payload.

## Role changes

`updateDisplayName` and `updatePassword` in `web/src/lib/users.ts` write the name or the password only. They never assign `role`. The migration also revokes `UPDATE` on `profiles.role` and adds a restrictive policy so a user cannot change their own role. That policy is not applied, because there is no database.

## Other people's rows

`web/src/lib/records.ts` reads and writes favorites and library rows only for the email on the session. There is no query that returns another user's favorites, library items, or downloads. The downloads list is empty for everyone, including admins. Row security for a real database is in the migration and was not executed.

## Production gallery

`/dev/states` calls `notFound()` when `NODE_ENV` is `production`. The proxy also returns HTTP 404 for `/dev` in production, including for a visitor with no session.

Checked with `npm run build` and `npx next start -p 3456`. `GET /dev/states` returned **404**.
