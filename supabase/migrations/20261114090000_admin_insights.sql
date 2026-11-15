-- Admin insights: signups, the verification funnel, quota pressure, catalog health and reading activity.
-- Aggregates only. No names, emails or per-person rows leave this function.

create or replace function public.admin_insights(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_days int := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_since date := current_date - (case when p_days in (7, 30, 90) then p_days else 30 end - 1);
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'signupsPerDay', (
      select coalesce(jsonb_agg(jsonb_build_object('date', s.day, 'count', s.n) order by s.day), '[]'::jsonb)
      from (
        select days.day::date as day, count(p.id) as n
        from generate_series(v_since, current_date, interval '1 day') as days(day)
        left join public.profiles p
          on p.created_at::date = days.day::date and p.role <> 'admin'
        group by days.day
      ) s
    ),
    'signupsInRange', (
      select count(*) from public.profiles p where p.role <> 'admin' and p.created_at::date >= v_since
    ),
    'funnel', jsonb_build_object(
      'signedUp', (select count(*) from public.profiles p where p.role <> 'admin'),
      'verified', (select count(*) from public.profiles p where p.role <> 'admin' and p.email_verified_at is not null),
      'downloaded', (
        select count(distinct d.user_id) from public.downloads d
        join public.profiles p on p.id = d.user_id
        where p.role <> 'admin'
      )
    ),
    'quota', (
      select jsonb_build_object(
        'readers', count(*),
        'atLimit', count(*) filter (where x.limit_n > 0 and x.used >= x.limit_n),
        'nearLimit', count(*) filter (where x.limit_n > 0 and x.used < x.limit_n and x.used * 5 >= x.limit_n * 4)
      )
      from (
        select
          coalesce((select l.max_books from public.quota_limits l where l.tier = t.tier), 0) as limit_n,
          (
            select count(*)::int from public.downloads d
            where d.user_id = p.id
              and d.first_downloaded_at >= q.period_start
              and d.first_downloaded_at < q.period_end
          ) as used
        from public.profiles p
        cross join lateral (select public.account_tier(p.id) as tier) t
        cross join lateral public.quota_period(p.created_at, now()) q
        where p.role <> 'admin'
      ) x
    ),
    'catalog', jsonb_build_object(
      'total', (select count(*) from public.books),
      'withFile', (select count(*) from public.books b where b.file_path is not null),
      'withoutCover', (select count(*) from public.books b where b.cover_url is null)
    ),
    'reading', jsonb_build_object(
      'activeReaders', (
        select count(distinct r.user_id) from public.reading_progress r where r.updated_at::date >= v_since
      ),
      'booksRead', (
        select count(distinct r.book_id) from public.reading_progress r where r.updated_at::date >= v_since
      )
    )
  );
end;
$$;

revoke all on function public.admin_insights(int) from public, anon;
grant execute on function public.admin_insights(int) to authenticated;
