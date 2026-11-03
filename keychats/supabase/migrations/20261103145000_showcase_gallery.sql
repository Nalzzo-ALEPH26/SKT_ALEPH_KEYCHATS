begin;

-- Add optional gallery fields without resetting any existing project, comment or visit count.
alter table public.showcase_sites
  add column if not exists details text,
  add column if not exists project_type text not null default 'web',
  add column if not exists thumbnail_path text;

alter table public.showcase_sites
  add constraint showcase_sites_details_length check (details is null or char_length(details) <= 5000),
  add constraint showcase_sites_project_type_check check (project_type in ('web','app','other')),
  add constraint showcase_sites_thumbnail_path_length check (thumbnail_path is null or char_length(thumbnail_path) <= 260);

-- Existing policy protects author_id; only explicitly allow changing the new presentation fields.
grant update(details, project_type, thumbnail_path) on public.showcase_sites to authenticated;

-- Aggregate comment totals in the database rather than downloading every comment to the gallery.
-- SECURITY INVOKER preserves the underlying showcase_comments RLS policy.
create function public.showcase_comment_counts()
returns table(site_id uuid, comment_count bigint)
language sql stable security invoker set search_path = '' as $$
  select comment.site_id, count(*)::bigint
  from public.showcase_comments comment
  group by comment.site_id;
$$;
revoke all on function public.showcase_comment_counts() from public, anon;
grant execute on function public.showcase_comment_counts() to authenticated;

-- All screenshots remain private; only approved active users can request signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('showcase-thumbnails', 'showcase-thumbnails', false, 4194304,
  array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do nothing;

create policy showcase_thumbnails_read_active on storage.objects
  for select to authenticated
  using (bucket_id = 'showcase-thumbnails' and (select private.is_active_user()));

create policy showcase_thumbnails_upload_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'showcase-thumbnails'
    and (select private.is_active_user())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.showcase_sites site
      where site.id::text = (storage.foldername(name))[2]
        and site.author_id = (select auth.uid())
    )
  );

create policy showcase_thumbnails_delete_owner_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'showcase-thumbnails'
    and (select private.is_active_user())
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
  );

commit;
