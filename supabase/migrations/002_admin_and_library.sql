-- Additive Phase 1 migration.
-- Expects public.profiles, public.books, and public.downloads to exist already.
-- Assumed columns are listed in docs/database.md.
-- This file is not applied automatically. There is no live database in this repo.

create table if not exists public.library_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.library_items enable row level security;

drop policy if exists library_items_own on public.library_items;
create policy library_items_own
  on public.library_items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, delete on table public.library_items to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists downloads_admin_select on public.downloads;
create policy downloads_admin_select
  on public.downloads
  for select
  to authenticated
  using (public.is_admin());

-- A user cannot change their own role, including through a crafted update.
revoke update (role) on table public.profiles from anon, authenticated, public;

drop policy if exists profiles_keep_own_role on public.profiles;
create policy profiles_keep_own_role
  on public.profiles
  as restrictive
  for update
  to authenticated
  using (true)
  with check (
    role is not distinct from (
      select p.role from public.profiles p where p.id = auth.uid()
    )
    or auth.uid() is distinct from id
  );

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'books', (select count(*) from public.books),
    'registeredUsers', (select count(*) from auth.users where is_anonymous = false),
    'guestSessions', (select count(*) from auth.users where is_anonymous = true),
    'downloads', (select count(*) from public.downloads),
    'downloadsLast30Days', (
      select count(*) from public.downloads
      where created_at >= now() - interval '30 days'
    ),
    'booksByCategory', (
      select coalesce(jsonb_agg(jsonb_build_object('label', category, 'count', n) order by n desc), '[]'::jsonb)
      from (
        select category, count(*) as n
        from public.books
        group by category
      ) categories
    ),
    'mostDownloaded', (
      select coalesce(jsonb_agg(jsonb_build_object('title', title, 'count', n) order by n desc), '[]'::jsonb)
      from (
        select b.title, count(*) as n
        from public.downloads d
        join public.books b on b.id = d.book_id
        group by b.id, b.title
        order by count(*) desc
        limit 5
      ) top_books
    ),
    'recentDownloads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'who', who_name,
        'book', title,
        'at', created_at
      ) order by created_at desc), '[]'::jsonb)
      from (
        select
          coalesce(p.display_name, 'Guest') as who_name,
          b.title,
          d.created_at
        from public.downloads d
        join public.books b on b.id = d.book_id
        left join public.profiles p on p.id = d.user_id
        order by d.created_at desc
        limit 10
      ) recent
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.admin_list_users(search text, lim int, off int)
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  downloads_used int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.created_at,
    (select count(*)::int from public.downloads d where d.user_id = p.id) as downloads_used
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.is_anonymous = false
    and (
      search is null
      or btrim(search) = ''
      or p.display_name ilike '%' || search || '%'
      or u.email::text ilike '%' || search || '%'
    )
  order by p.created_at desc
  limit greatest(coalesce(lim, 25), 0)
  offset greatest(coalesce(off, 0), 0);
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_users(text, int, int) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
