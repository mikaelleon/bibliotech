# Testing notes

Checked on 7 November 2026. There is no Supabase project in this repo, so the SQL functions were not executed against Postgres. The app repeats the same checks in the Next.js server. Results below are for that server, plus a production build of `/dev/states`.

## Admin functions

`admin_stats()` and `admin_list_users()` in `supabase/migrations/002_admin_and_library.sql` raise `not allowed` unless `is_admin()` is true, and execute is revoked from `anon` and `public`.

In the running app, `web/src/lib/admin.ts` throws `not allowed` when the session is not an admin. Admin pages return no data in that case. The admin layout renders the 403 screen for a guest or a registered user. This was not verified by calling Postgres.

## Role changes

`updateDisplayName` and `updatePassword` in `web/src/lib/users.ts` write the name or the password only. They never assign `role`. The migration also revokes `UPDATE` on `profiles.role` and adds a restrictive policy so a user cannot change their own role. That policy is not applied, because there is no database.

## Other people's rows

`web/src/lib/records.ts` reads and writes favorites and library rows only for the email on the session. There is no query that returns another user's favorites, library items, or downloads. The downloads list is empty for everyone, including admins. Row security for a real database is in the migration and was not executed.

## Production gallery

`/dev/states` calls `notFound()` when `NODE_ENV` is `production`. The proxy also returns HTTP 404 for `/dev` in production, including for a visitor with no session.

Checked with `npm run build` and `npx next start -p 3456`. `GET /dev/states` returned **404**.
