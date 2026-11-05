begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'unread-a@keychats.test'),
  ('22222222-2222-2222-2222-222222222222', 'unread-b@keychats.test'),
  ('33333333-3333-3333-3333-333333333333', 'unread-outsider@keychats.test');
insert into public.profiles (user_id, username, display_name, status) values
  ('11111111-1111-1111-1111-111111111111', 'unread_a', 'Unread A', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'unread_b', 'Unread B', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'unread_outsider', 'Unread Outsider', 'active');
insert into public.channels (id, name, created_by) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'unread-private', '11111111-1111-1111-1111-111111111111');
insert into public.channel_members (channel_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member');
insert into public.dm_threads (id, user_low, user_high) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
insert into public.messages (channel_id, dm_thread_id, sender_id, body, deleted_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111111', 'channel incoming', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '22222222-2222-2222-2222-222222222222', 'channel own', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, '11111111-1111-1111-1111-111111111111', 'channel deleted', now()),
  (null, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'DM incoming', null),
  (null, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'DM own', null),
  (null, 'cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'DM deleted', now());

select ok(not has_function_privilege('anon', 'public.get_unread_counts()', 'execute'), 'anonymous role cannot call unread RPC');
select ok((select not prosecdef from pg_proc where oid = 'public.get_unread_counts()'::regprocedure), 'unread RPC remains security invoker');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select unread_count from public.get_unread_counts() where room_type = 'channel'), 1::bigint, 'missing channel marker excludes own and deleted messages');
select is((select unread_count from public.get_unread_counts() where room_type = 'dm'), 1::bigint, 'missing DM marker excludes own and deleted messages');

insert into public.read_states (user_id, channel_id, last_read_message_id) values
  (auth.uid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null);
insert into public.read_states (user_id, dm_thread_id, last_read_message_id) values
  (auth.uid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', null);
select is((select count(*) from public.get_unread_counts() where unread_count = 1), 2::bigint, 'null read markers match missing markers');
update public.read_states set last_read_message_id = (
  select max(m.id) from public.messages m
  where m.channel_id = read_states.channel_id or m.dm_thread_id = read_states.dm_thread_id
) where user_id = auth.uid();
select is((select count(*) from public.get_unread_counts()), 0::bigint, 'read rooms are omitted instead of returning zero-count rows');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.messages (channel_id, sender_id, body) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', auth.uid(), 'new channel');
insert into public.messages (dm_thread_id, sender_id, body) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', auth.uid(), 'new DM');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select unread_count from public.get_unread_counts() where room_type = 'channel'), 1::bigint, 'new channel messages after the marker are unread');
select is((select unread_count from public.get_unread_counts() where room_type = 'dm'), 1::bigint, 'new DM messages after the marker are unread');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
select is((select count(*) from public.get_unread_counts()), 0::bigint, 'outsiders cannot count private channel or DM messages');
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is((select count(*) from public.get_unread_counts()), 0::bigint, 'missing authenticated subject returns no rooms');
reset role;
update public.profiles set status = 'disabled' where user_id = '22222222-2222-2222-2222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
select is((select count(*) from public.get_unread_counts()), 0::bigint, 'inactive members cannot count messages');

select * from finish();
rollback;
