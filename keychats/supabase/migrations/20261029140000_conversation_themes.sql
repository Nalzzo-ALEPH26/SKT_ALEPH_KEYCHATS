begin;
create table public.conversation_themes (
  room_key text primary key,
  channel_id uuid unique references public.channels(id) on delete cascade,
  dm_thread_id uuid unique references public.dm_threads(id) on delete cascade,
  theme_id text not null default 'default' check (theme_id in ('default','cream','lavender','mint','sunset','midnight')),
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid references public.profiles(user_id),
  updated_by_name text not null,
  updated_at timestamptz not null default now(),
  check ((channel_id is not null and dm_thread_id is null and room_key = 'channel:' || channel_id::text)
      or (dm_thread_id is not null and channel_id is null and room_key = 'dm:' || dm_thread_id::text))
);
create index conversation_themes_updated_by_idx on public.conversation_themes(updated_by);
alter table public.conversation_themes enable row level security;
revoke all on public.conversation_themes from public, anon, authenticated;
grant select on public.conversation_themes to authenticated;
create policy conversation_themes_read_participants on public.conversation_themes for select to authenticated using (
  (channel_id is not null and private.can_access_channel(channel_id))
  or (dm_thread_id is not null and private.can_access_dm(dm_thread_id))
);
-- All writes go through this function. Clients cannot forge identity or revision.
create function public.set_conversation_theme(target_kind text, target_id uuid, selected_theme text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result public.conversation_themes; actor_name text; key text;
begin
  if not private.is_active_user() then raise exception 'Active account required' using errcode = '42501'; end if;
  if selected_theme is null or selected_theme not in ('default','cream','lavender','mint','sunset','midnight') then raise exception 'Invalid theme' using errcode = '22023'; end if;
  if target_kind = 'channel' then
    if not private.can_access_channel(target_id) or not exists (
      select 1 from public.channels c where c.id = target_id
        and (private.is_admin() or (not c.is_default and c.created_by = auth.uid()))
    ) then raise exception 'Channel theme permission denied' using errcode = '42501'; end if;
  elsif target_kind = 'dm' then
    if not private.can_access_dm(target_id) then raise exception 'DM participant required' using errcode = '42501'; end if;
  else raise exception 'Invalid room kind' using errcode = '22023'; end if;
  select display_name into actor_name from public.profiles where user_id = auth.uid();
  key := target_kind || ':' || target_id::text;
  insert into public.conversation_themes as existing (room_key,channel_id,dm_thread_id,theme_id,updated_by,updated_by_name)
  values (key, case when target_kind='channel' then target_id end, case when target_kind='dm' then target_id end, selected_theme,auth.uid(),coalesce(actor_name,'사용자'))
  on conflict (room_key) do update set theme_id=excluded.theme_id, updated_by=excluded.updated_by,
    updated_by_name=excluded.updated_by_name, updated_at=clock_timestamp(), revision=existing.revision+1
  where existing.theme_id is distinct from excluded.theme_id
  returning * into result;
  if not found then select * into result from public.conversation_themes where room_key=key; end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.set_conversation_theme(text,uuid,text) from public,anon;
grant execute on function public.set_conversation_theme(text,uuid,text) to authenticated;
-- Publish only the theme table; messages/unread counts are untouched.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversation_themes') then
    alter publication supabase_realtime add table public.conversation_themes;
  end if;
end $$;
commit;
