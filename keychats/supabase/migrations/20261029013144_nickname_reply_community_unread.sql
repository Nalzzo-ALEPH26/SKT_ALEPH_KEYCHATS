-- Enforce the 15-character nickname limit everywhere existing display names are stored.
update public.profiles
set display_name = left(btrim(display_name), 15),
    updated_at = now()
where char_length(btrim(display_name)) > 15;

update public.signup_requests
set display_name = left(btrim(display_name), 15)
where char_length(btrim(display_name)) > 15;

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length
  check (char_length(btrim(display_name)) between 1 and 15);
alter table public.signup_requests drop constraint if exists signup_requests_display_name_length;
alter table public.signup_requests add constraint signup_requests_display_name_length
  check (char_length(btrim(display_name)) between 1 and 15);

create table public.community_read_states (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, community_id)
);
alter table public.community_read_states enable row level security;
revoke all on table public.community_read_states from anon, authenticated;
grant select, insert, update on table public.community_read_states to authenticated;
create policy community_read_states_select_own on public.community_read_states for select to authenticated
using ((select private.is_active_user()) and user_id = (select auth.uid()));
create policy community_read_states_insert_own on public.community_read_states for insert to authenticated
with check ((select private.is_active_user()) and user_id = (select auth.uid()));
create policy community_read_states_update_own on public.community_read_states for update to authenticated
using ((select private.is_active_user()) and user_id = (select auth.uid()))
with check ((select private.is_active_user()) and user_id = (select auth.uid()));

insert into public.community_read_states (user_id, community_id, last_read_at, updated_at)
select p.user_id, c.id, now(), now() from public.profiles p cross join public.communities c
where p.status = 'active' on conflict (user_id, community_id) do nothing;

create or replace function public.get_community_unread_counts()
returns table (community_id uuid, unread_count bigint)
language sql stable security invoker set search_path = public as $$
  select c.id,
    count(cp.id) filter (
      where cp.author_id <> (select auth.uid())
        and cp.created_at > coalesce(crs.last_read_at, me.created_at)
    )::bigint
  from public.communities c
  cross join lateral (
    select p.created_at from public.profiles p where p.user_id = (select auth.uid())
  ) me
  left join public.community_read_states crs on crs.community_id = c.id and crs.user_id = (select auth.uid())
  left join public.community_posts cp on cp.community_id = c.id
  where (select private.is_active_user())
  group by c.id, crs.last_read_at, me.created_at;
$$;
revoke all on function public.get_community_unread_counts() from public, anon;
grant execute on function public.get_community_unread_counts() to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end $$;
