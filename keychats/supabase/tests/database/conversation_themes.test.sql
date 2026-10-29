begin;
create extension if not exists pgtap with schema extensions;
select plan(15);
insert into auth.users(id,email) values
 ('a1111111-1111-1111-1111-111111111111','theme1@keychats.test'),
 ('a2222222-2222-2222-2222-222222222222','theme2@keychats.test'),
 ('a3333333-3333-3333-3333-333333333333','theme3@keychats.test');
insert into public.profiles(user_id,username,display_name,status) values
 ('a1111111-1111-1111-1111-111111111111','themeone','Theme One','active'),
 ('a2222222-2222-2222-2222-222222222222','themetwo','Theme Two','active'),
 ('a3333333-3333-3333-3333-333333333333','themethree','Theme Three','active');
insert into public.channels(id,name,created_by) values ('ab111111-1111-1111-1111-111111111111','theme-test-channel','a1111111-1111-1111-1111-111111111111');
insert into public.channel_members(channel_id,user_id,role) values
 ('ab111111-1111-1111-1111-111111111111','a1111111-1111-1111-1111-111111111111','owner'),
 ('ab111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222','member');
insert into public.dm_threads(id,user_low,user_high) values ('ac111111-1111-1111-1111-111111111111','a1111111-1111-1111-1111-111111111111','a2222222-2222-2222-2222-222222222222');
select ok(not has_table_privilege('authenticated','public.conversation_themes','UPDATE'), 'direct update forbidden');
select ok(not has_table_privilege('authenticated','public.conversation_themes','INSERT'), 'direct insert forbidden');
select ok(not has_function_privilege('anon','public.set_conversation_theme(text,uuid,text)','EXECUTE'), 'anonymous RPC forbidden');
select ok(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='conversation_themes'), 'theme realtime enabled');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"role":"member"}}',true);
select is(public.set_conversation_theme('channel','ab111111-1111-1111-1111-111111111111','mint')->>'theme_id','mint','owner sets theme');
select is(public.set_conversation_theme('dm','ac111111-1111-1111-1111-111111111111','lavender')->>'theme_id','lavender','DM participant sets theme');
select throws_ok($$select public.set_conversation_theme('dm','ac111111-1111-1111-1111-111111111111','invalid')$$,'22023','Invalid theme','invalid theme rejected');
select set_config('request.jwt.claims','{"sub":"a2222222-2222-2222-2222-222222222222","role":"authenticated","app_metadata":{"role":"member"}}',true);
select is((select theme_id from public.conversation_themes where dm_thread_id='ac111111-1111-1111-1111-111111111111'),'lavender','other DM participant sees same theme');
select is(public.set_conversation_theme('dm','ac111111-1111-1111-1111-111111111111','midnight')->>'revision','2','second participant changes shared theme');
select is(public.set_conversation_theme('dm','ac111111-1111-1111-1111-111111111111','midnight')->>'revision','2','same theme does not create duplicate event');
select throws_ok($$select public.set_conversation_theme('channel','ab111111-1111-1111-1111-111111111111','cream')$$,'42501','Channel theme permission denied','ordinary channel member cannot change theme');
select set_config('request.jwt.claims','{"sub":"a3333333-3333-3333-3333-333333333333","role":"authenticated","app_metadata":{"role":"member"}}',true);
select is((select count(*) from public.conversation_themes),0::bigint,'outsider cannot see themes');
select throws_ok($$select public.set_conversation_theme('dm','ac111111-1111-1111-1111-111111111111','cream')$$,'42501','DM participant required','outsider cannot change DM');
reset role;
update public.profiles set status='disabled' where user_id='a1111111-1111-1111-1111-111111111111';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"role":"member"}}',true);
select is((select count(*) from public.conversation_themes),0::bigint,'disabled participant cannot read themes');
select throws_ok($$select public.set_conversation_theme('dm','ac111111-1111-1111-1111-111111111111','cream')$$,'42501','Active account required','disabled participant cannot change theme');
select * from finish();
rollback;
