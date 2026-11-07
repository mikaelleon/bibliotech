-- Base schema. Runs before 002_admin_and_library.sql and 003_admin_support.sql,
-- which alter and query the tables created here.
--
-- Tables: profiles, books, downloads, favorites.
-- library_items, is_admin() and the admin RPCs come from 002 and 003.
--
-- Access model
-- - Every table has row level security on and explicit grants. New public tables
--   get full privileges for anon and authenticated by default, so each table
--   revokes those first and grants back only what clients need.
-- - Clients never write downloads. Phase 2 adds request_download(), which the
--   API calls with the secret key after checking the quota.
-- - Book writes happen on the server with the secret key (admin screens).
-- - A profile row is created by a trigger on auth.users at sign-up.
--
-- Rollback (empty project only):
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
--   drop table if exists public.favorites, public.downloads, public.books, public.profiles;

-- profiles: one row per auth user

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
-- Column-level grant: users can change their display name and nothing else.
-- role stays server-only (002 also revokes it and adds a restrictive policy).
grant update (display_name) on table public.profiles to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create the profile when a user signs up. Only display_name is read from user
-- metadata, which the client controls. role always starts as 'user'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- books: the catalog. Visitors (no account) can browse it.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  category text not null,
  language text not null default 'English',
  published text,
  license text not null,
  source_name text not null,
  source_url text not null,
  summary text not null default '',
  summary_short text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_category_idx on public.books (category);
create index books_title_idx on public.books (lower(title));

alter table public.books enable row level security;

revoke all on table public.books from anon, authenticated;
grant select on table public.books to anon, authenticated;

create policy books_select_all
  on public.books
  for select
  to anon, authenticated
  using (true);

-- downloads: read-only for clients. Phase 2 reshapes this table to one row per
-- (user, book) and adds the quota function.

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  book_id uuid not null references public.books (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index downloads_user_id_idx on public.downloads (user_id);
create index downloads_book_id_idx on public.downloads (book_id);
create index downloads_created_at_idx on public.downloads (created_at);

alter table public.downloads enable row level security;

revoke all on table public.downloads from anon, authenticated;
grant select on table public.downloads to authenticated;

create policy downloads_select_own
  on public.downloads
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- favorites: set-based, own rows only

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index favorites_book_id_idx on public.favorites (book_id);

alter table public.favorites enable row level security;

revoke all on table public.favorites from anon, authenticated;
grant select, insert, delete on table public.favorites to authenticated;

create policy favorites_select_own
  on public.favorites
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy favorites_insert_own
  on public.favorites
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy favorites_delete_own
  on public.favorites
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
