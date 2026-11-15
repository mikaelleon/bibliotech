-- Admin account management: disable, password reset, delete, create.
--   - downloads keep their rows when an account is deleted (user_id becomes null), so statistics stay accurate
--   - admin_list_users and admin_get_user report whether an account is disabled
--   - admin_guard_target: one place for the safeguards (admin only, target exists, not yourself)
-- The auth changes themselves (ban, delete, invite) run in the app through the auth admin API.

-- ---------------------------------------------------------------------------
-- Keep download records when an account is deleted

alter table public.downloads alter column user_id drop not null;
alter table public.downloads drop constraint if exists downloads_user_id_fkey;
alter table public.downloads
  add constraint downloads_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Guard used before any account action

create or replace function public.admin_guard_target(p_user uuid, p_allow_self boolean default false)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  if p_user = (select auth.uid()) and not coalesce(p_allow_self, false) then
    raise exception 'self' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.admin_guard_target(uuid, boolean) from public, anon;
grant execute on function public.admin_guard_target(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Disabled flag in the list and the detail

drop function if exists public.admin_list_users(text, int, int, text, text);

create function public.admin_list_users(
  search text,
  lim int,
  off int,
  p_role text default null,
  p_type text default null
)
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz,
  email_verified_at timestamptz,
  tier text,
  downloads_used int,
  download_limit int,
  resets_at timestamptz,
  disabled boolean,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_like text := '%' || replace(replace(replace(btrim(coalesce(search, '')), '\', '\\'), '%', '\%'), '_', '\_') || '%';
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
    p.email_verified_at,
    t.tier,
    case when t.tier = 'admin' then 0 else (
      select count(*)::int from public.downloads d
      where d.user_id = p.id and d.first_downloaded_at >= q.period_start and d.first_downloaded_at < q.period_end
    ) end,
    coalesce((select l.max_books from public.quota_limits l where l.tier = t.tier), 0),
    q.period_end,
    (u.banned_until is not null and u.banned_until > now()),
    count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral (select public.account_tier(p.id) as tier) t
  cross join lateral public.quota_period(p.created_at, now()) q
  where coalesce(u.is_anonymous, false) = false
    and (p_role is null or p_role = '' or p.role = p_role)
    and (p_type is null or p_type = '' or t.tier = p_type)
    and (
      btrim(coalesce(search, '')) = ''
      or p.display_name ilike v_like
      or u.email::text ilike v_like
    )
  order by p.created_at desc
  limit greatest(coalesce(lim, 25), 0)
  offset greatest(coalesce(off, 0), 0);
end;
$$;

revoke all on function public.admin_list_users(text, int, int, text, text) from public, anon;
grant execute on function public.admin_list_users(text, int, int, text, text) to authenticated;

create or replace function public.admin_get_user(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_row jsonb;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'email', u.email::text,
    'display_name', p.display_name,
    'role', p.role,
    'created_at', p.created_at,
    'email_verified_at', p.email_verified_at,
    'tier', t.tier,
    'disabled', (u.banned_until is not null and u.banned_until > now()),
    'downloads_used', case when t.tier = 'admin' then 0 else (
      select count(*)::int from public.downloads d
      where d.user_id = p.id and d.first_downloaded_at >= q.period_start and d.first_downloaded_at < q.period_end
    ) end,
    'download_limit', coalesce((select l.max_books from public.quota_limits l where l.tier = t.tier), 0),
    'resets_at', q.period_end,
    'favorites', (select count(*) from public.favorites f where f.user_id = p.id),
    'library_items', (select count(*) from public.library_items li where li.user_id = p.id),
    'admin_count', (select count(*) from public.profiles a where a.role = 'admin')
  )
  into v_row
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral (select public.account_tier(p.id) as tier) t
  cross join lateral public.quota_period(p.created_at, now()) q
  where p.id = p_user
    and coalesce(u.is_anonymous, false) = false;

  if v_row is null then
    return null;
  end if;

  perform public.admin_log('view_user', p_user, '{}'::jsonb);
  return v_row;
end;
$$;

revoke all on function public.admin_get_user(uuid) from public, anon;
grant execute on function public.admin_get_user(uuid) to authenticated;
