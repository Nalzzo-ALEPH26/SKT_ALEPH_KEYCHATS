begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

select has_function('private','is_moderator',array[]::text[],'moderator identity helper exists');
select has_function('private','can_moderate_content',array[]::text[],'delegated content role helper exists');
select ok((select count(*) >= 14 from pg_policies where policyname like '%moderator%' and schemaname in ('public','storage')), 'moderator policies exist');
select ok(not has_table_privilege('authenticated','public.signup_requests','SELECT'), 'moderator has no user-request table access');
select ok(not has_table_privilege('authenticated','public.password_reset_requests','SELECT'), 'moderator has no password-reset table access');

insert into auth.users(id,email,raw_app_meta_data) values
 ('66666666-6666-6666-6666-666666666666','moderator@keychats.test','{"role":"moderator"}'::jsonb),
 ('77777777-7777-7777-7777-777777777777','member@keychats.test','{"role":"member"}'::jsonb),
 ('88888888-8888-8888-8888-888888888888','third@keychats.test','{"role":"member"}'::jsonb);
insert into public.profiles(user_id,username,display_name,status) values
 ('66666666-6666-6666-6666-666666666666','moderator_test','Moderator','active'),
 ('77777777-7777-7777-7777-777777777777','member_test','Member','active'),
 ('88888888-8888-8888-8888-888888888888','third_test','Third','active');
insert into public.channels(id,name,created_by)
values('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','moderator-check','77777777-7777-7777-7777-777777777777');
insert into public.messages(channel_id,sender_id,body)
values('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee','77777777-7777-7777-7777-777777777777','moderate me');
insert into public.dm_threads(id,user_low,user_high)
values('ffffffff-ffff-ffff-ffff-ffffffffffff','77777777-7777-7777-7777-777777777777','88888888-8888-8888-8888-888888888888');
insert into public.messages(dm_thread_id,sender_id,body)
values('ffffffff-ffff-ffff-ffff-ffffffffffff','77777777-7777-7777-7777-777777777777','private dm');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","app_metadata":{"role":"member"}}',true);
select is(private.is_moderator(),true,'database trusts current auth user app_metadata, not a stale JWT');
select is((select count(*) from public.channels where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),1::bigint,'moderator can inspect another channel');
select is((select count(*) from public.messages where channel_id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),1::bigint,'moderator can read channel content');
select is((select count(*) from public.messages where dm_thread_id='ffffffff-ffff-ffff-ffff-ffffffffffff'),0::bigint,'moderator cannot read other people private DMs');
select is((select count(*) from public.dm_threads where id='ffffffff-ffff-ffff-ffff-ffffffffffff'),0::bigint,'moderator cannot list other private DM threads');
select is(private.can_manage_channel('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),true,'moderator can manage channels');

reset role;
update auth.users set raw_app_meta_data='{"role":"member"}'::jsonb
where id='66666666-6666-6666-6666-666666666666';
set local role authenticated;
select is(private.is_moderator(),false,'revocation takes effect immediately even with old JWT');
select is((select count(*) from public.channels where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),0::bigint,'revoked moderator cannot read a private channel');

select * from finish();
rollback;
