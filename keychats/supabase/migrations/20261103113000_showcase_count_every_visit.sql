begin;
-- Update the counter policy without touching existing counts or legacy checkpoint data.
create or replace function public.record_showcase_visit(target_site_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_count bigint;
begin
  if not private.is_active_user() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  -- Record every click, including the owner's clicks and immediate revisits.
  -- Protect this site from concurrent deletion until the increment completes.
  perform 1 from public.showcase_sites where id = target_site_id for key share;
  if not found then
    raise exception 'Site not found' using errcode = 'P0002';
  end if;

  insert into public.showcase_visit_counts as counts(site_id,visit_count)
  values (target_site_id, 1)
  on conflict (site_id) do update set visit_count = counts.visit_count + 1
  returning visit_count into current_count;

  return jsonb_build_object('count', current_count, 'counted', true);
end;
$$;
revoke all on function public.record_showcase_visit(uuid) from public,anon;
grant execute on function public.record_showcase_visit(uuid) to authenticated;
commit;
