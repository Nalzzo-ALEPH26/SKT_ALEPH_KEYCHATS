create table public.browser_notification_preferences (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  room_type text not null check (room_type in ('channel', 'dm')),
  room_id uuid not null,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, room_type, room_id)
);

alter table public.browser_notification_preferences enable row level security;

revoke all on table public.browser_notification_preferences from anon, authenticated;
grant select, insert, update, delete on table public.browser_notification_preferences to authenticated;

create policy browser_notification_preferences_select_self
on public.browser_notification_preferences
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_active_user())
);

create policy browser_notification_preferences_insert_self
on public.browser_notification_preferences
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_active_user())
);

create policy browser_notification_preferences_update_self
on public.browser_notification_preferences
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_active_user())
)
with check (
  user_id = (select auth.uid())
  and (select private.is_active_user())
);

create policy browser_notification_preferences_delete_self
on public.browser_notification_preferences
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_active_user())
);

create table public.admin_notification_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('signup_request', 'password_reset')),
  entity_id uuid not null,
  created_at timestamptz not null default now()
);

create index admin_notification_events_created_at_idx
on public.admin_notification_events(created_at desc);

alter table public.admin_notification_events enable row level security;

revoke all on table public.admin_notification_events from anon, authenticated;
grant select on table public.admin_notification_events to authenticated;
grant select, insert on table public.admin_notification_events to service_role;

create policy admin_notification_events_select_admin
on public.admin_notification_events
for select
to authenticated
using (
  (select private.is_active_user())
  and (select private.is_admin())
);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_notification_events'
  ) then
    execute 'alter publication supabase_realtime add table public.admin_notification_events';
  end if;
end
$$;
