-- Phase 2: verified state on profiles.
--
-- Guest = signed-up account with email_verified_at null (limit 5 per quota period).
-- Registered = the same account once email_verified_at is set (limit 10).
-- Supabase's auth.users.email_confirmed_at is set at sign-up because Confirm email is off,
-- so it means nothing here. email_verified_at is the only source of truth, and only the
-- server (secret key) writes it, from the app's own verification link.
--
-- Rollback: alter table public.profiles drop column email_verified_at;

alter table public.profiles add column email_verified_at timestamptz;

comment on column public.profiles.email_verified_at is
  'Set by the server when the user opens their verification link. Null = Guest tier.';

-- 001 grants clients update (display_name) only, so this column is already closed. Stated
-- explicitly so the rule is visible next to the column.
revoke update (email_verified_at) on table public.profiles from anon, authenticated, public;
