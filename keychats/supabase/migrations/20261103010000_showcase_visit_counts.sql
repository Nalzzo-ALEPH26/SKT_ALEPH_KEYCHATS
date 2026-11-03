begin;
-- Public aggregate, separate from editable site content so authors cannot forge counts.
create table public.showcase_visit_counts (
  site_id uuid primary key references public.showcase_sites(id) on delete cascade,
  visit_count bigint not null default 0 check (visit_count >= 0)
);
-- Keep only the last counted visit for each site/user, not a browsing history.
create table public.showcase_visit_checkpoints (
  site_id uuid not null references public.showcase_sites(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id),
  last_counted_at timestamptz not null,
  primary key(site_id,user_id)
);
create index showcase_visit_checkpoints_user_idx on public.showcase_visit_checkpoints(user_id);
alter table public.showcase_visit_counts enable row level security;
alter table public.showcase_visit_checkpoints enable row level security;
revoke all on public.showcase_visit_counts,public.showcase_visit_checkpoints from public,anon,authenticated;
grant select on public.showcase_visit_counts to authenticated;
create policy showcase_visit_counts_read on public.showcase_visit_counts for select to authenticated
using ((select private.is_active_user()));

create function public.record_showcase_visit(target_site_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  site_author uuid;
  checkpoint_id uuid;
  current_count bigint;
  counted_at timestamptz := clock_timestamp();
begin
  if not private.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  -- Block concurrent deletion until this visit transaction finishes.
  select author_id into site_author from public.showcase_sites where id=target_site_id for key share;
  if not found then raise exception 'Site not found' using errcode = 'P0002'; end if;
  if site_author = actor_id then
    select visit_count into current_count from public.showcase_visit_counts where site_id=target_site_id;
    return jsonb_build_object('count',coalesce(current_count,0),'counted',false);
  end if;
  -- The unique key serializes concurrent clicks from the same user, including multiple tabs/devices.
  insert into public.showcase_visit_checkpoints as checkpoint(site_id,user_id,last_counted_at)
  values(target_site_id,actor_id,counted_at)
  on conflict(site_id,user_id) do update set last_counted_at=excluded.last_counted_at
  where checkpoint.last_counted_at <= excluded.last_counted_at - interval '30 minutes'
  returning site_id into checkpoint_id;
  if checkpoint_id is not null then
    insert into public.showcase_visit_counts as counts(site_id,visit_count) values(target_site_id,1)
    on conflict(site_id) do update set visit_count=counts.visit_count+1
    returning visit_count into current_count;
  else
    select visit_count into current_count from public.showcase_visit_counts where site_id=target_site_id;
  end if;
  return jsonb_build_object('count',coalesce(current_count,0),'counted',checkpoint_id is not null);
end;
$$;
revoke all on function public.record_showcase_visit(uuid) from public,anon;
grant execute on function public.record_showcase_visit(uuid) to authenticated;
commit;
