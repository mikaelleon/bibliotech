-- Phase 3: AI assistant usage tracking and quota (database side).
--   - ai_limits: per-tier daily and monthly question caps, editable without a redeploy
--   - ai_requests: one row per Gemini call (metadata only, never message text)
--   - reserve_ai_request(): atomic limit check + pending row, serialized per user
--   - finish_ai_request(), log_ai_extra_call(): close out a request, record fallback retries
--   - ai_quota_status(), my_ai_quota(): usage for the apps' quota display
--   - purge_old_ai_requests(): retention helper
--
-- Same conventions as 20261107142501_quota_and_verification.sql: search_path = '', schema-qualified
-- names, UTC time math, no grants to anon/authenticated except my_ai_quota().
--
-- Counting rules (docs/ai-assistant.md 5.2):
--   - The user's quota counts rows with counts_for_quota and status <> 'failed'.
--   - Global (per day, per minute) and per-IP counters count EVERY row, including failed rows and
--     fallback retries, because Google counts them against the project's rate limit.
--
-- Rollback:
--   drop function if exists public.purge_old_ai_requests(int), public.my_ai_quota(),
--     public.ai_quota_status(uuid), public.log_ai_extra_call(uuid, text, text, text),
--     public.finish_ai_request(uuid, text, text, int, int, int),
--     public.reserve_ai_request(uuid, text, int, int, int, int);
--   drop table if exists public.ai_requests, public.ai_limits;

-- ---------------------------------------------------------------------------
-- Limits per tier

create table public.ai_limits (
  tier text primary key check (tier in ('guest', 'registered', 'admin')),
  per_day int not null check (per_day >= 0),
  per_month int not null check (per_month >= 0)
);

insert into public.ai_limits (tier, per_day, per_month)
values ('guest', 5, 100), ('registered', 20, 400), ('admin', 40, 800);

alter table public.ai_limits enable row level security;
revoke all on table public.ai_limits from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Requests

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ip_hash text,
  created_at timestamptz not null default now(),
  status text not null check (status in ('pending', 'ok', 'refused', 'partial', 'failed')),
  model text,
  prompt_tokens int check (prompt_tokens >= 0),
  output_tokens int check (output_tokens >= 0),
  latency_ms int check (latency_ms >= 0),
  counts_for_quota boolean not null default true
);

create index ai_requests_user_created_idx on public.ai_requests (user_id, created_at desc);
create index ai_requests_created_idx on public.ai_requests (created_at);
create index ai_requests_ip_created_idx on public.ai_requests (ip_hash, created_at);

alter table public.ai_requests enable row level security;
revoke all on table public.ai_requests from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Usage snapshot shared by reserve and status. Not exposed to any API role.

create function public.ai_usage_snapshot(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_tier text;
  v_day_start timestamptz := date_trunc('day', now());
  v_month_start timestamptz := date_trunc('month', now());
  v_limit_day int;
  v_limit_month int;
  v_used_day int;
  v_used_month int;
begin
  v_tier := public.account_tier(p_user);
  if v_tier is null then
    return null;
  end if;

  select l.per_day, l.per_month into v_limit_day, v_limit_month
  from public.ai_limits l where l.tier = v_tier;

  select
    count(*) filter (where r.created_at >= v_day_start),
    count(*)
  into v_used_day, v_used_month
  from public.ai_requests r
  where r.user_id = p_user
    and r.created_at >= v_month_start
    and r.counts_for_quota
    and r.status <> 'failed';

  return jsonb_build_object(
    'tier', v_tier,
    'usedToday', v_used_day,
    'limitToday', v_limit_day,
    'usedMonth', v_used_month,
    'limitMonth', v_limit_month,
    'resetsDailyAt', v_day_start + interval '1 day',
    'resetsMonthlyAt', v_month_start + interval '1 month'
  );
end;
$$;

revoke all on function public.ai_usage_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.ai_usage_snapshot(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- reserve_ai_request: called by the API with the secret key after it has verified the caller.
-- Limits that live in env vars are passed in so they can change without a migration.
-- Statuses: not_found, too_fast, busy, daily_limit, monthly_limit, ip_limit, assistant_resting,
-- busy_try_again, ok. On ok the result carries the new request id and the usage snapshot.

create function public.reserve_ai_request(
  p_user uuid,
  p_ip_hash text,
  p_global_daily int default 1200,
  p_global_rpm int default 24,
  p_ip_daily int default 60,
  p_burst_seconds int default 3
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_snap jsonb;
  v_day_start timestamptz := date_trunc('day', now());
  v_oldest timestamptz;
  v_count int;
  v_id uuid;
begin
  -- Serialize requests per user so parallel requests can't both take the last slot.
  perform pg_advisory_xact_lock(hashtextextended('reserve_ai_request:' || p_user::text, 0));

  v_snap := public.ai_usage_snapshot(p_user);
  if v_snap is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- 1. Per-user burst.
  if exists (
    select 1 from public.ai_requests r
    where r.user_id = p_user
      and r.counts_for_quota
      and r.created_at > now() - make_interval(secs => greatest(p_burst_seconds, 0))
  ) then
    return v_snap || jsonb_build_object('status', 'too_fast');
  end if;

  -- 2. In-flight request. A pending row older than 60 s is treated as finished (crash safety).
  if exists (
    select 1 from public.ai_requests r
    where r.user_id = p_user
      and r.status = 'pending'
      and r.created_at > now() - interval '60 seconds'
  ) then
    return v_snap || jsonb_build_object('status', 'busy');
  end if;

  -- 3 and 4. Per-user daily and monthly limits.
  if (v_snap ->> 'usedToday')::int >= (v_snap ->> 'limitToday')::int then
    return v_snap || jsonb_build_object('status', 'daily_limit');
  end if;
  if (v_snap ->> 'usedMonth')::int >= (v_snap ->> 'limitMonth')::int then
    return v_snap || jsonb_build_object('status', 'monthly_limit');
  end if;

  -- 7 (checked early). Per-IP daily limit, every row counts.
  if p_ip_hash is not null then
    select count(*)::int into v_count
    from public.ai_requests r
    where r.ip_hash = p_ip_hash and r.created_at >= v_day_start;
    if v_count >= p_ip_daily then
      return v_snap || jsonb_build_object('status', 'ip_limit');
    end if;
  end if;

  -- 5. Global daily budget, every row counts.
  select count(*)::int into v_count
  from public.ai_requests r where r.created_at >= v_day_start;
  if v_count >= p_global_daily then
    return v_snap || jsonb_build_object('status', 'assistant_resting');
  end if;

  -- 6. Global calls in the last 60 s, every row counts.
  select count(*)::int, min(r.created_at) into v_count, v_oldest
  from public.ai_requests r where r.created_at > now() - interval '60 seconds';
  if v_count >= p_global_rpm then
    return v_snap || jsonb_build_object(
      'status', 'busy_try_again',
      'retryAfterSeconds', greatest(1, ceil(60 - extract(epoch from (now() - v_oldest)))::int)
    );
  end if;

  insert into public.ai_requests (user_id, ip_hash, status)
  values (p_user, p_ip_hash, 'pending')
  returning id into v_id;

  -- Report usage including the row just reserved.
  return public.ai_usage_snapshot(p_user) || jsonb_build_object('status', 'ok', 'requestId', v_id);
end;
$$;

revoke all on function public.reserve_ai_request(uuid, text, int, int, int, int) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid, text, int, int, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- finish_ai_request: close the pending row with its final status and metrics.

create function public.finish_ai_request(
  p_id uuid,
  p_status text,
  p_model text,
  p_prompt int,
  p_output int,
  p_ms int
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_status not in ('ok', 'refused', 'partial', 'failed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.ai_requests
  set status = p_status,
      model = left(p_model, 80),
      prompt_tokens = p_prompt,
      output_tokens = p_output,
      latency_ms = p_ms
  where id = p_id
    and status = 'pending';
end;
$$;

revoke all on function public.finish_ai_request(uuid, text, text, int, int, int) from public, anon, authenticated;
grant execute on function public.finish_ai_request(uuid, text, text, int, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- log_ai_extra_call: record an extra Gemini call (a fallback retry, or the failed primary call
-- before it) so the global counters match what Google counts. Never charged to the user.

create function public.log_ai_extra_call(
  p_user uuid,
  p_ip_hash text,
  p_model text,
  p_status text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_status not in ('ok', 'refused', 'partial', 'failed') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  insert into public.ai_requests (user_id, ip_hash, status, model, counts_for_quota)
  values (p_user, p_ip_hash, p_status, left(p_model, 80), false);
end;
$$;

revoke all on function public.log_ai_extra_call(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.log_ai_extra_call(uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Quota display

create function public.ai_quota_status(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ai_usage_snapshot(p_user);
$$;

revoke all on function public.ai_quota_status(uuid) from public, anon, authenticated;
grant execute on function public.ai_quota_status(uuid) to service_role;

-- The caller's own AI quota. Never takes a user id from the client.
create function public.my_ai_quota()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.ai_usage_snapshot((select auth.uid()));
$$;

revoke all on function public.my_ai_quota() from public, anon;
grant execute on function public.my_ai_quota() to authenticated;

-- ---------------------------------------------------------------------------
-- Retention: call from a scheduled job or by hand. Returns the number of rows deleted.

create function public.purge_old_ai_requests(p_days int default 90)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  delete from public.ai_requests
  where created_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_ai_requests(int) from public, anon, authenticated;
grant execute on function public.purge_old_ai_requests(int) to service_role;
