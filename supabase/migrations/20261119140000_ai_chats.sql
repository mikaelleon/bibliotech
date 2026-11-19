-- AI assistant chat history and chat sessions for registered (email-verified) accounts.
--   - ai_chats: one row per chat session (title taken from the first question, no extra AI call)
--   - ai_chat_messages: the questions and answers of a session
--   - append_ai_chat_turn(): the only writer. Creates the chat on first use (registered tier only),
--     enforces the caps, stores one question + answer pair.
--   - purge_old_ai_chats(): retention helper
--
-- PRIVACY: this stores message text, which ai_requests deliberately does not (docs/ai-assistant.md
-- section 7). It is limited to registered accounts, only the owner can read it, the owner can delete
-- one chat or all chats at any time, and it is purged after 90 days without activity.
--
-- Same conventions as 20261119110000_ai_assistant.sql: search_path = '', schema-qualified names,
-- no writes from anon/authenticated. Readers get select (and delete on ai_chats) through RLS.
--
-- Rollback:
--   drop function if exists public.purge_old_ai_chats(int),
--     public.append_ai_chat_turn(uuid, uuid, text, text, text);
--   drop table if exists public.ai_chat_messages, public.ai_chats;

create table public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_chats_user_updated_idx on public.ai_chats (user_id, updated_at desc);
create index ai_chats_updated_idx on public.ai_chats (updated_at);

create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.ai_chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seq bigint generated always as identity,
  role text not null check (role in ('user', 'model')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index ai_chat_messages_chat_seq_idx on public.ai_chat_messages (chat_id, seq);

alter table public.ai_chats enable row level security;
alter table public.ai_chat_messages enable row level security;

revoke all on table public.ai_chats from anon, authenticated;
revoke all on table public.ai_chat_messages from anon, authenticated;
grant select, delete on table public.ai_chats to authenticated;
grant select on table public.ai_chat_messages to authenticated;

create policy ai_chats_select_own
  on public.ai_chats
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_chats_delete_own
  on public.ai_chats
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy ai_chat_messages_select_own
  on public.ai_chat_messages
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- append_ai_chat_turn: called by the API with the secret key after the caller is verified.
-- p_chat is chosen by the client (a new uuid for a new chat). If it doesn't exist yet it is
-- created for p_user, which needs the registered tier. If it exists it must belong to p_user.
-- Statuses: ok, not_registered, not_found, chat_full.

create function public.append_ai_chat_turn(
  p_user uuid,
  p_chat uuid,
  p_title text,
  p_user_text text,
  p_model_text text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_title text;
  v_count int;
begin
  perform pg_advisory_xact_lock(hashtextextended('append_ai_chat_turn:' || p_user::text, 0));

  select c.user_id, c.title into v_owner, v_title from public.ai_chats c where c.id = p_chat for update;

  if not found then
    if public.account_tier(p_user) is distinct from 'registered' then
      return jsonb_build_object('status', 'not_registered');
    end if;
    v_title := left(nullif(btrim(regexp_replace(p_title, '\s+', ' ', 'g')), ''), 80);
    if v_title is null then
      v_title := 'New chat';
    end if;
    insert into public.ai_chats (id, user_id, title) values (p_chat, p_user, v_title);

    -- Keep the 50 most recent chats. Older ones go, with their messages.
    delete from public.ai_chats
    where user_id = p_user
      and id not in (
        select c.id from public.ai_chats c where c.user_id = p_user order by c.updated_at desc, c.created_at desc limit 50
      );
  elsif v_owner <> p_user then
    return jsonb_build_object('status', 'not_found');
  else
    select count(*)::int into v_count from public.ai_chat_messages m where m.chat_id = p_chat;
    if v_count >= 200 then
      return jsonb_build_object('status', 'chat_full');
    end if;
  end if;

  insert into public.ai_chat_messages (chat_id, user_id, role, body)
  values (p_chat, p_user, 'user', left(p_user_text, 4000));
  insert into public.ai_chat_messages (chat_id, user_id, role, body)
  values (p_chat, p_user, 'model', left(p_model_text, 4000));

  update public.ai_chats set updated_at = now() where id = p_chat;

  return jsonb_build_object('status', 'ok', 'chatId', p_chat, 'title', v_title);
end;
$$;

revoke all on function public.append_ai_chat_turn(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.append_ai_chat_turn(uuid, uuid, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Retention: call from a scheduled job or by hand. Returns the number of chats deleted.

create function public.purge_old_ai_chats(p_days int default 90)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_deleted int;
begin
  delete from public.ai_chats
  where updated_at < now() - make_interval(days => greatest(p_days, 1));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_old_ai_chats(int) from public, anon, authenticated;
grant execute on function public.purge_old_ai_chats(int) to service_role;
