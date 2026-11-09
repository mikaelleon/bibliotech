-- A book can be saved on more than one device. Keep the latest label, and remember every device.

alter table public.downloads
  add column if not exists devices text[] not null default '{}';

update public.downloads
set devices = array[last_device_label]
where last_device_label is not null
  and cardinality(devices) = 0;

create or replace function public.request_download(
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
  v_devices text[];
begin
  perform pg_advisory_xact_lock(hashtextextended('request_download:' || p_user::text, 0));

  v_tier := public.account_tier(p_user);
  if v_tier is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_tier = 'admin' then
    return jsonb_build_object('status', 'forbidden');
  end if;
  if not exists (
    select 1 from public.books b
    where b.id = p_book and b.file_path is not null
  ) then
    return jsonb_build_object('status', 'not_available');
  end if;

  select * into v_existing from public.downloads d where d.user_id = p_user and d.book_id = p_book for update;
  if found then
    v_quota := public.quota_status(p_user);
    if not coalesce(p_confirm_repeat, false) then
      return v_quota || jsonb_build_object('status', 'already_downloaded',
        'lastDownloadedAt', v_existing.last_downloaded_at);
    end if;
    v_devices := v_existing.devices;
    if v_device is not null and not v_device = any(v_devices) then
      v_devices := v_devices || v_device;
    end if;
    update public.downloads
    set last_downloaded_at = now(),
        times_downloaded = times_downloaded + 1,
        last_device_label = coalesce(v_device, last_device_label),
        devices = v_devices
    where id = v_existing.id;
    return v_quota || jsonb_build_object('status', 'repeat_ok');
  end if;

  v_quota := public.quota_status(p_user);
  v_used := (v_quota ->> 'used')::int;
  v_limit := (v_quota ->> 'limit')::int;
  if v_used >= v_limit then
    return v_quota || jsonb_build_object('status', 'quota_exceeded');
  end if;

  insert into public.downloads (user_id, book_id, last_device_label, devices)
  values (
    p_user,
    p_book,
    v_device,
    case when v_device is null then '{}'::text[] else array[v_device] end
  );
  return v_quota || jsonb_build_object('status', 'ok', 'used', v_used + 1);
end;
$$;

revoke all on function public.request_download(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.request_download(uuid, uuid, text, boolean) to service_role;
