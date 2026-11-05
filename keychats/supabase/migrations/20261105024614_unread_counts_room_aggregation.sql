create or replace function public.get_unread_counts()
returns table (
  room_type text,
  room_id uuid,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
with current_user_id as (
    select auth.uid() as user_id
  ),
  channel_counts as (
    select
      'channel'::text as room_type,
      cm.channel_id as room_id,
      unread.unread_count
    from public.channel_members cm
    cross join current_user_id u
    left join public.read_states rs
      on rs.user_id = u.user_id
      and rs.channel_id = cm.channel_id
      and rs.dm_thread_id is null
    cross join lateral (
      select count(*)::bigint as unread_count
      from public.messages m
      where m.channel_id = cm.channel_id
        and m.deleted_at is null
        and m.sender_id <> u.user_id
        and m.id > coalesce(rs.last_read_message_id, 0)
    ) unread
    where cm.user_id = u.user_id
      and unread.unread_count > 0
  ),
  dm_counts as (
    select
      'dm'::text as room_type,
      d.id as room_id,
      unread.unread_count
    from public.dm_threads d
    cross join current_user_id u
    left join public.read_states rs
      on rs.user_id = u.user_id
      and rs.dm_thread_id = d.id
      and rs.channel_id is null
    cross join lateral (
      select count(*)::bigint as unread_count
      from public.messages m
      where m.dm_thread_id = d.id
        and m.deleted_at is null
        and m.sender_id <> u.user_id
        and m.id > coalesce(rs.last_read_message_id, 0)
    ) unread
    where u.user_id in (d.user_low, d.user_high)
      and unread.unread_count > 0
  )
  select * from channel_counts
  union all
  select * from dm_counts;
$$;
