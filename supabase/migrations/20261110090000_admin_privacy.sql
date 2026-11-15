-- Admin privacy pass.
--   - admin_audit_log: append-only record of what an admin looked at or changed
--   - admin_list_users: search, role and type filters and paging run in SQL
--   - admin_get_user: one account plus shelf counts (no shelf contents), and it logs the view
--   - admin_stats / admin_list_downloads: activity feeds show a masked identity
-- Replaces functions from 20261107142501_quota_and_verification.sql. Additive otherwise.

-- ---------------------------------------------------------------------------
-- Audit log

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_user_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx on public.admin_audit_log (target_user_id);

alter table public.admin_audit_log enable row level security;
-- No policies and no grants: rows are written by admin_log() and read by admin_list_audit() only.
revoke all on table public.admin_audit_log from anon, authenticated;

create or replace function public.admin_log(p_action text, p_target uuid, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into public.admin_audit_log (admin_id, action, target_user_id, detail)
  values ((select auth.uid()), left(p_action, 80), p_target, coalesce(p_detail, '{}'::jsonb));
end;
$$;

revoke all on function public.admin_log(text, uuid, jsonb) from public, anon;
grant execute on function public.admin_log(text, uuid, jsonb) to authenticated;

create or replace function public.admin_list_audit(lim int, off int)
returns table (
  created_at timestamptz,
  admin_label text,
  action text,
  target_label text,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    l.created_at,
    public.mask_identity(ap.display_name, au.email::text),
    l.action,
    case when l.target_user_id is null then null
         else public.mask_identity(tp.display_name, tu.email::text) end,
    count(*) over ()
  from public.admin_audit_log l
  left join public.profiles ap on ap.id = l.admin_id
  left join auth.users au on au.id = l.admin_id
  left join public.profiles tp on tp.id = l.target_user_id
  left join auth.users tu on tu.id = l.target_user_id
  order by l.created_at desc
  limit greatest(coalesce(lim, 25), 0)
  offset greatest(coalesce(off, 0), 0);
end;
$$;

revoke all on function public.admin_list_audit(int, int) from public, anon;
grant execute on function public.admin_list_audit(int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Masked identity for activity feeds: "Dane P." or "d***@gmail.com".

create or replace function public.mask_identity(p_name text, p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_name), '') is not null then
      split_part(btrim(p_name), ' ', 1)
      || case
           when position(' ' in btrim(p_name)) > 0
           then ' ' || upper(left(regexp_replace(btrim(p_name), '^.*\s', ''), 1)) || '.'
           else ''
         end
    when nullif(p_email, '') is not null then
      left(split_part(p_email, '@', 1), 1) || '***@' || split_part(p_email, '@', 2)
    else 'Reader'
  end;
$$;

revoke all on function public.mask_identity(text, text) from public, anon;
grant execute on function public.mask_identity(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- User list with filters and paging in SQL

drop function if exists public.admin_list_users(text, int, int);

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

-- ---------------------------------------------------------------------------
-- One account, shelf counts only. Volatile because it writes the audit row.

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

-- ---------------------------------------------------------------------------
-- Activity feeds: masked identity. Same shapes as before.

create or replace function public.admin_list_downloads(lim int, off int)
returns table (
  who_label text,
  book_title text,
  first_downloaded_at timestamptz,
  last_downloaded_at timestamptz,
  times_downloaded int,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    public.mask_identity(p.display_name, u.email::text),
    b.title,
    d.first_downloaded_at,
    d.last_downloaded_at,
    d.times_downloaded,
    count(*) over ()
  from public.downloads d
  join public.books b on b.id = d.book_id
  join public.profiles p on p.id = d.user_id
  left join auth.users u on u.id = d.user_id
  order by d.last_downloaded_at desc
  limit greatest(coalesce(lim, 25), 0)
  offset greatest(coalesce(off, 0), 0);
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'books', (select count(*) from public.books),
    'registeredUsers', (
      select count(*) from public.profiles p where p.role <> 'admin' and p.email_verified_at is not null
    ),
    'guestUsers', (
      select count(*) from public.profiles p where p.role <> 'admin' and p.email_verified_at is null
    ),
    'downloads', (select count(*) from public.downloads),
    'repeatDownloads', (select coalesce(sum(d.times_downloaded - 1), 0) from public.downloads d),
    'downloadsLast30Days', (
      select count(*) from public.downloads d where d.first_downloaded_at >= now() - interval '30 days'
    ),
    'booksByCategory', (
      select coalesce(jsonb_agg(jsonb_build_object('label', c.category, 'count', c.n) order by c.n desc), '[]'::jsonb)
      from (select b.category, count(*) as n from public.books b group by b.category) c
    ),
    'mostDownloaded', (
      select coalesce(jsonb_agg(jsonb_build_object('title', t.title, 'count', t.n) order by t.n desc), '[]'::jsonb)
      from (
        select b.title, count(*) as n
        from public.downloads d
        join public.books b on b.id = d.book_id
        group by b.id, b.title
        order by count(*) desc
        limit 5
      ) t
    ),
    'recentDownloads', (
      select coalesce(jsonb_agg(jsonb_build_object('who', r.who, 'book', r.title, 'at', r.at) order by r.at desc), '[]'::jsonb)
      from (
        select public.mask_identity(p.display_name, u.email::text) as who,
               b.title,
               d.last_downloaded_at as at
        from public.downloads d
        join public.books b on b.id = d.book_id
        join public.profiles p on p.id = d.user_id
        left join auth.users u on u.id = d.user_id
        order by d.last_downloaded_at desc
        limit 10
      ) r
    ),
    'downloadsPerDay', (
      select coalesce(jsonb_agg(jsonb_build_object('date', s.day, 'count', s.n) order by s.day), '[]'::jsonb)
      from (
        select days.day::date as day, count(d.id) as n
        from generate_series(current_date - 29, current_date, interval '1 day') as days(day)
        left join public.downloads d on d.first_downloaded_at::date = days.day::date
        group by days.day
      ) s
    )
  );
end;
$$;

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_downloads(int, int) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_downloads(int, int) to authenticated;
