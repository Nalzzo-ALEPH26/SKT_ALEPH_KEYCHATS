begin;
create table public.showcase_sites (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(user_id),
  title text not null check (char_length(btrim(title)) between 1 and 60),
  url text not null check (url ~ '^https?://' and char_length(url) <= 2048),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  color text not null default 'yellow' check (color in ('yellow','blue','green','pink')),
  tags text[] not null default '{}' check (cardinality(tags) <= 8),
  created_at timestamptz not null default now()
);
create table public.showcase_comments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.showcase_sites(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index showcase_sites_created_idx on public.showcase_sites(created_at desc);
create index showcase_comments_site_idx on public.showcase_comments(site_id,created_at);
alter table public.showcase_sites enable row level security;
alter table public.showcase_comments enable row level security;
revoke all on public.showcase_sites, public.showcase_comments from anon, authenticated;
grant select, insert, delete on public.showcase_sites, public.showcase_comments to authenticated;
grant update(title,url,description,color,tags) on public.showcase_sites to authenticated;
create policy showcase_sites_read on public.showcase_sites for select to authenticated using ((select private.is_active_user()));
create policy showcase_sites_create on public.showcase_sites for insert to authenticated with check ((select private.is_active_user()) and author_id = (select auth.uid()));
create policy showcase_sites_edit on public.showcase_sites for update to authenticated using ((select private.is_active_user()) and author_id = (select auth.uid())) with check ((select private.is_active_user()) and author_id = (select auth.uid()));
create policy showcase_sites_delete on public.showcase_sites for delete to authenticated using ((select private.is_active_user()) and (author_id = (select auth.uid()) or (select private.is_admin())));
create policy showcase_comments_read on public.showcase_comments for select to authenticated using ((select private.is_active_user()));
create policy showcase_comments_create on public.showcase_comments for insert to authenticated with check ((select private.is_active_user()) and author_id = (select auth.uid()));
create policy showcase_comments_delete on public.showcase_comments for delete to authenticated using ((select private.is_active_user()) and (author_id = (select auth.uid()) or (select private.is_admin())));
commit;
