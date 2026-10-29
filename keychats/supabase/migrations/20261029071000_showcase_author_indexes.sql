begin;

create index showcase_sites_author_id_idx
  on public.showcase_sites(author_id);

create index showcase_comments_author_id_idx
  on public.showcase_comments(author_id);

commit;
