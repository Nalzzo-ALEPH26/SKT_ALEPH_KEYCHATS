begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
insert into auth.users(id,email) values
 ('b1111111-1111-1111-1111-111111111111','visit-owner@keychats.test'),
 ('b2222222-2222-2222-2222-222222222222','visit-one@keychats.test'),
 ('b3333333-3333-3333-3333-333333333333','visit-two@keychats.test');
insert into public.profiles(user_id,username,display_name,status) values
 ('b1111111-1111-1111-1111-111111111111','visitowner','Visit Owner','active'),
 ('b2222222-2222-2222-2222-222222222222','visitone','Visit One','active'),
 ('b3333333-3333-3333-3333-333333333333','visittwo','Visit Two','active');
insert into public.showcase_sites(id,author_id,title,url,description) values
 ('bd111111-1111-1111-1111-111111111111','b1111111-1111-1111-1111-111111111111','Visit test','https://example.com','Test');
select ok(not has_table_privilege('authenticated','public.showcase_visit_counts','INSERT'), 'cannot forge initial count');
select ok(not has_table_privilege('authenticated','public.showcase_visit_counts','UPDATE'), 'cannot overwrite count');
select ok(not has_table_privilege('authenticated','public.showcase_visit_checkpoints','SELECT'), 'visit identity is private');
select ok(not has_table_privilege('authenticated','public.showcase_visit_checkpoints','UPDATE'), 'cannot reset deduplication');
select ok(not has_function_privilege('anon','public.record_showcase_visit(uuid)','EXECUTE'), 'anonymous cannot invoke counter');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','0','own visit excluded');
select set_config('request.jwt.claims','{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','1','first visit increments');
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'counted','false','repeat visit excluded');
select is((select visit_count from public.showcase_visit_counts where site_id='bd111111-1111-1111-1111-111111111111'),1::bigint,'repeat visit does not change aggregate');
select set_config('request.jwt.claims','{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','2','different user increments');
select throws_ok($$select public.record_showcase_visit('bd000000-0000-0000-0000-000000000000')$$,'P0002','Site not found','missing site rejected');
reset role;
-- Simulate the passage of the rolling 30-minute window without a slow test.
update public.showcase_visit_checkpoints set last_counted_at=clock_timestamp()-interval '31 minutes'
where user_id='b2222222-2222-2222-2222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','3','new visit after 30 minutes increments');
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','3','new dedup window starts after counted visit');
reset role;
select is((select count(*) from public.showcase_visit_checkpoints where site_id='bd111111-1111-1111-1111-111111111111'),2::bigint,'only one checkpoint per visitor retained');
update public.profiles set status='disabled' where user_id='b2222222-2222-2222-2222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select throws_ok($$select public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')$$,'42501','Active account required','disabled visitor rejected');
select is((select count(*) from public.showcase_visit_counts),0::bigint,'disabled visitor cannot read totals');
reset role;
delete from public.showcase_sites where id='bd111111-1111-1111-1111-111111111111';
select is((select count(*) from public.showcase_visit_counts where site_id='bd111111-1111-1111-1111-111111111111'),0::bigint,'site deletion cleans up aggregate');
select is((select count(*) from public.showcase_visit_checkpoints where site_id='bd111111-1111-1111-1111-111111111111'),0::bigint,'site deletion cleans up checkpoints');
select * from finish();
rollback;
