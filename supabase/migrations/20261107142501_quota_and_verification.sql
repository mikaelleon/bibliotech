-- Phase 2 checkpoints 1, 2 and 8 (database side):
--   - tiers and limits in one place (quota_limits, account_tier)
--   - monthly quota period anchored on registration (quota_period, quota_status, my_quota)
--   - downloads reshaped to one row per (user, book) and request_download()
--   - email verification tokens (email_verifications, verify_email_token)
--   - changing an account's email clears its verified state
--   - admin functions rewritten for the new shapes, with search_path = ''
--
-- Every function here runs with search_path = '' and schema-qualified names. Time math runs
-- in UTC (set timezone = 'UTC'), so a quota period renews at the same UTC instant each month.
--
-- Rollback (no real download data yet): drop the functions and tables created here, then
-- recreate downloads, is_admin(), admin_stats(), admin_list_users() and admin_list_downloads()
-- from 001_base_schema.sql, 002_admin_and_library.sql and 003_admin_support.sql.

-- ---------------------------------------------------------------------------
-- Leftovers from 002: library_items kept the default anon grant (RLS still blocked rows).

revoke all on table public.library_items from anon;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Tiers and limits

create table public.quota_limits (
  tier text primary key check (tier in ('guest', 'registered')),
  max_books int not null check (max_books >= 0)
);

insert into public.quota_limits (tier, max_books) values ('guest', 5), ('registered', 10);

alter table public.quota_limits enable row level security;
revoke all on table public.quota_limits from anon, authenticated;

-- 'admin' if role is admin, else 'registered' once the email is verified, else 'guest'.
create function public.account_tier(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.role = 'admin' then 'admin'
    when p.email_verified_at is not null then 'registered'
    else 'guest'
  end
  from public.profiles p
  where p.id = p_user;
$$;

revoke all on function public.account_tier(uuid) from public, anon, authenticated;

-- Monthly window anchored on p_anchor (registration). period_start = anchor + n months for the
-- largest n with period_start <= p_now. Months are always added to the anchor itself, so a
-- Jan 31 anchor gives Feb 28 (or 29), then Mar 31: day clamping never drifts.
create function public.quota_period(
  p_anchor timestamptz,
  p_now timestamptz,
  out period_start timestamptz,
  out period_end timestamptz
)
language plpgsql
stable
set search_path = ''
set timezone = 'UTC'
as $$
declare
  n int;
begin
  if p_now < p_anchor then
    period_start := p_anchor;
    period_end := p_anchor + interval '1 month';
    return;
  end if;

  n := (extract(year from age(p_now, p_anchor)) * 12 + extract(month from age(p_now, p_anchor)))::int;
  period_start := p_anchor + make_interval(months => n);
  if period_start > p_now then
    n := n - 1;
    period_start := p_anchor + make_interval(months => n);
  end if;
  period_end := p_anchor + make_interval(months => n + 1);
  if period_end <= p_now then
    n := n + 1;
    period_start := period_end;
    period_end := p_anchor + make_interval(months => n + 1);
  end if;
end;
$$;

revoke all on function public.quota_period(timestamptz, timestamptz) from public, anon;
grant execute on function public.quota_period(timestamptz, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- downloads: one row per (user, book). Existing rows are merged; rows without a user are dropped.

create table public.downloads_new (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete restrict,
  first_downloaded_at timestamptz not null default now(),
  last_downloaded_at timestamptz not null default now(),
  times_downloaded int not null default 1 check (times_downloaded >= 1),
  last_device_label text check (char_length(last_device_label) <= 80),
  unique (user_id, book_id)
);

insert into public.downloads_new (user_id, book_id, first_downloaded_at, last_downloaded_at, times_downloaded)
select user_id, book_id, min(created_at), max(created_at), count(*)::int
from public.downloads
where user_id is not null
group by user_id, book_id;

drop table public.downloads;
alter table public.downloads_new rename to downloads;
alter table public.downloads rename constraint downloads_new_pkey to downloads_pkey;
alter table public.downloads rename constraint downloads_new_user_id_book_id_key to downloads_user_id_book_id_key;

create index downloads_user_first_idx on public.downloads (user_id, first_downloaded_at);
create index downloads_book_id_idx on public.downloads (book_id);
create index downloads_first_downloaded_at_idx on public.downloads (first_downloaded_at);

alter table public.downloads enable row level security;

revoke all on table public.downloads from anon, authenticated;
grant select on table public.downloads to authenticated;

create policy downloads_select_own
  on public.downloads
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy downloads_admin_select
  on public.downloads
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Quota status

-- tier, used (new books first downloaded in the current period), limit, period start, reset time.
create function public.quota_status(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_anchor timestamptz;
  v_tier text;
  v_limit int;
  v_used int;
  v_start timestamptz;
  v_end timestamptz;
begin
  select p.created_at into v_anchor from public.profiles p where p.id = p_user;
  if not found then
    return null;
  end if;

  v_tier := public.account_tier(p_user);
  select q.period_start, q.period_end into v_start, v_end from public.quota_period(v_anchor, now()) q;

  if v_tier = 'admin' then
    return jsonb_build_object('tier', v_tier, 'used', 0, 'limit', 0,
      'periodStart', v_start, 'resetsAt', v_end);
  end if;

  select l.max_books into v_limit from public.quota_limits l where l.tier = v_tier;
  select count(*)::int into v_used
  from public.downloads d
  where d.user_id = p_user
    and d.first_downloaded_at >= v_start
    and d.first_downloaded_at < v_end;

  return jsonb_build_object('tier', v_tier, 'used', v_used, 'limit', v_limit,
    'periodStart', v_start, 'resetsAt', v_end);
end;
$$;

revoke all on function public.quota_status(uuid) from public, anon, authenticated;
grant execute on function public.quota_status(uuid) to service_role;

-- The caller's own quota, for the apps' quota display. Never takes a user id from the client.
create function public.my_quota()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.quota_status((select auth.uid()));
$$;

revoke all on function public.my_quota() from public, anon;
grant execute on function public.my_quota() to authenticated;

-- ---------------------------------------------------------------------------
-- request_download: the only writer of downloads. Called by the API with the secret key after
-- it has verified the caller. Statuses: forbidden, not_found, not_available, already_downloaded,
-- repeat_ok, quota_exceeded, ok.
create function public.request_download(
  p_user uuid,
  p_book uuid,
  p_device text,
  p_confirm_repeat boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_tier text;
  v_existing public.downloads%rowtype;
  v_quota jsonb;
  v_used int;
  v_limit int;
  v_device text := left(nullif(btrim(p_device), ''), 80);
begin
  -- Serialize requests per user so parallel requests can't both take the last slot.
  perform pg_advisory_xact_lock(hashtextextended('request_download:' || p_user::text, 0));

  v_tier := public.account_tier(p_user);
  if v_tier is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_tier = 'admin' then
    return jsonb_build_object('status', 'forbidden');
  end if;
  -- Phase 2 checkpoint 4 adds books.file_path; until then any catalog book is available.
  if not exists (select 1 from public.books b where b.id = p_book) then
    return jsonb_build_object('status', 'not_available');
  end if;

  select * into v_existing from public.downloads d where d.user_id = p_user and d.book_id = p_book for update;
  if found then
    v_quota := public.quota_status(p_user);
    if not coalesce(p_confirm_repeat, false) then
      return v_quota || jsonb_build_object('status', 'already_downloaded',
        'lastDownloadedAt', v_existing.last_downloaded_at);
    end if;
    update public.downloads
    set last_downloaded_at = now(),
        times_downloaded = times_downloaded + 1,
        last_device_label = coalesce(v_device, last_device_label)
    where id = v_existing.id;
    return v_quota || jsonb_build_object('status', 'repeat_ok');
  end if;

  v_quota := public.quota_status(p_user);
  v_used := (v_quota ->> 'used')::int;
  v_limit := (v_quota ->> 'limit')::int;
  if v_used >= v_limit then
    return v_quota || jsonb_build_object('status', 'quota_exceeded');
  end if;

  insert into public.downloads (user_id, book_id, last_device_label) values (p_user, p_book, v_device);
  return v_quota || jsonb_build_object('status', 'ok', 'used', v_used + 1);
end;
$$;

revoke all on function public.request_download(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.request_download(uuid, uuid, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Email verification. Only the SHA-256 hash of each token is stored. Server access only.

create table public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_verifications_user_created_idx on public.email_verifications (user_id, created_at desc);

alter table public.email_verifications enable row level security;
revoke all on table public.email_verifications from anon, authenticated;

-- Atomic check-and-use. Statuses: invalid, used, expired, email_changed, already_verified, verified.
create function public.verify_email_token(p_token_hash text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.email_verifications%rowtype;
  v_current_email text;
  v_verified_at timestamptz;
begin
  select * into v_row from public.email_verifications e where e.token_hash = p_token_hash for update;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  if v_row.used_at is not null then
    return jsonb_build_object('status', 'used');
  end if;
  if v_row.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select lower(u.email::text) into v_current_email from auth.users u where u.id = v_row.user_id;
  if v_current_email is distinct from lower(v_row.email) then
    return jsonb_build_object('status', 'email_changed');
  end if;

  update public.email_verifications set used_at = now() where id = v_row.id;

  select p.email_verified_at into v_verified_at from public.profiles p where p.id = v_row.user_id;
  if v_verified_at is not null then
    return jsonb_build_object('status', 'already_verified', 'userId', v_row.user_id);
  end if;

  update public.profiles set email_verified_at = now() where id = v_row.user_id;
  return jsonb_build_object('status', 'verified', 'userId', v_row.user_id);
end;
$$;

revoke all on function public.verify_email_token(text) from public, anon, authenticated;
grant execute on function public.verify_email_token(text) to service_role;

-- Changing the email address downgrades the account to Guest until the new address is verified.
-- Downloads already made stay. Outstanding links for the old address stop working.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email_verified_at = null where id = new.id;
    update public.email_verifications set used_at = now() where user_id = new.id and used_at is null;
  end if;
  return new;
end;
$$;

revoke all on function public.handle_user_email_change() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Admin functions for the new shapes. Each refuses non-admins in SQL.

drop function if exists public.admin_stats();
drop function if exists public.admin_list_users(text, int, int);
drop function if exists public.admin_list_downloads(int, int);

create function public.admin_stats()
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
        select coalesce(nullif(p.display_name, ''), u.email::text, 'Reader') as who,
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

create function public.admin_list_users(search text, lim int, off int)
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

create function public.admin_list_downloads(lim int, off int)
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
    coalesce(nullif(p.display_name, ''), u.email::text, 'Reader'),
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

revoke all on function public.admin_stats() from public, anon;
revoke all on function public.admin_list_users(text, int, int) from public, anon;
revoke all on function public.admin_list_downloads(int, int) from public, anon;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_list_downloads(int, int) to authenticated;
