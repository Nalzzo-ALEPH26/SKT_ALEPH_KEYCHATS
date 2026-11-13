-- Server-owned Auth metadata controls moderator privileges; account administration remains admin only.
create or replace function private.is_moderator()
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_user()
    and exists (
      select 1 from auth.users u
      where u.id = (select auth.uid())
        and u.raw_app_meta_data ->> 'role' = 'moderator'
    );
$$;
revoke all on function private.is_moderator() from public, anon;
grant execute on function private.is_moderator() to authenticated;

create or replace function private.can_moderate_content()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_admin() or private.is_moderator(); $$;
revoke all on function private.can_moderate_content() from public, anon;
grant execute on function private.can_moderate_content() to authenticated;

create or replace function private.can_manage_channel(target_channel_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_active_user()
    and (
      private.can_moderate_content()
      or exists (
        select 1 from public.channels c
        where c.id = target_channel_id and c.created_by = (select auth.uid())
      )
    );
$$;
create policy channels_select_moderator on public.channels
for select to authenticated using ((select private.is_moderator()));
create policy channel_members_select_moderator on public.channel_members
for select to authenticated using ((select private.is_moderator()));
create policy messages_select_moderator_channels on public.messages
for select to authenticated using ((select private.is_moderator()) and channel_id is not null);
create policy attachments_select_moderator_channels on public.attachments
for select to authenticated using (
  (select private.is_moderator()) and exists (
    select 1 from public.messages m
    where m.id = attachments.message_id and m.channel_id is not null and m.deleted_at is null
  )
);
create policy chat_attachments_select_moderator_channels on storage.objects
for select to authenticated using (
  bucket_id = 'chat-attachments' and (select private.is_moderator())
  and exists (
    select 1 from public.attachments a
    join public.messages m on m.id = a.message_id
    where a.storage_path = name and m.channel_id is not null and m.deleted_at is null
  )
);
create policy message_pins_select_moderator_channels on public.message_pins
for select to authenticated using (
  (select private.is_moderator()) and exists (
    select 1 from public.messages m
    where m.id = message_pins.message_id and m.channel_id is not null
  )
);
create policy message_pins_insert_moderator_channels on public.message_pins
for insert to authenticated with check (
  (select private.is_moderator()) and pinned_by = (select auth.uid())
  and exists (
    select 1 from public.messages m
    where m.id = message_pins.message_id and m.channel_id is not null and m.deleted_at is null
  )
);
create policy message_pins_delete_moderator_channels on public.message_pins
for delete to authenticated using (
  (select private.is_moderator()) and exists (
    select 1 from public.messages m
    where m.id = message_pins.message_id and m.channel_id is not null
  )
);
create policy communities_delete_moderator on public.communities
for delete to authenticated using ((select private.is_moderator()));
create policy community_posts_delete_moderator on public.community_posts
for delete to authenticated using ((select private.is_moderator()));
create policy community_comments_delete_moderator on public.community_comments
for delete to authenticated using ((select private.is_moderator()));
create policy community_pins_insert_moderator on public.community_pins
for insert to authenticated with check (
  (select private.is_moderator()) and pinned_by = (select auth.uid())
);
create policy community_pins_delete_moderator on public.community_pins
for delete to authenticated using ((select private.is_moderator()));
create policy community_post_pins_insert_moderator on public.community_post_pins
for insert to authenticated with check (
  (select private.is_moderator()) and pinned_by = (select auth.uid())
);
create policy community_post_pins_delete_moderator on public.community_post_pins
for delete to authenticated using ((select private.is_moderator()));
create policy community_comment_pins_insert_moderator on public.community_comment_pins
for insert to authenticated with check (
  (select private.is_moderator()) and pinned_by = (select auth.uid())
);
create policy community_comment_pins_delete_moderator on public.community_comment_pins
for delete to authenticated using ((select private.is_moderator()));
