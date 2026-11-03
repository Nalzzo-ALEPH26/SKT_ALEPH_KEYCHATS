begin;
create extension if not exists pgtap with schema extensions;
select plan(19);
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
select ok(not has_table_privilege('authenticated','public.showcase_visit_checkpoints','UPDATE'), 'cannot reset old checkpoints');
select ok(not has_function_privilege('anon','public.record_showcase_visit(uuid)','EXECUTE'), 'anonymous cannot invoke counter');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','1','author visit increments');
select set_config('request.jwt.claims','{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','2','first visitor click increments');
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','3','immediate repeat click increments');
select is((select visit_count from public.showcase_visit_counts where site_id='bd111111-1111-1111-1111-111111111111'),3::bigint,'repeat counts persist');
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'counted','true','repeat click counted true');
select set_config('request.jwt.claims','{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','5','another visitor increments');
select throws_ok($$select public.record_showcase_visit('bd000000-0000-0000-0000-000000000000')$$,'P0002','Site not found','missing site rejected');
select set_config('request.jwt.claims','{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated"}',true);
select is(public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')->>'count','6','author repeat click increments');
reset role;
select is((select count(*) from public.showcase_visit_checkpoints where site_id='bd111111-1111-1111-1111-111111111111'),0::bigint,'legacy deduplication checkpoints are unused');
update public.profiles set status='disabled' where user_id='b2222222-2222-2222-2222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}',true);
select throws_ok($$select public.record_showcase_visit('bd111111-1111-1111-1111-111111111111')$$,'42501','Active account required','disabled visitor rejected');
select is((select count(*) from public.showcase_visit_counts),0::bigint,'disabled visitor cannot read totals');
reset role;
select is((select visit_count from public.showcase_visit_counts where site_id='bd111111-1111-1111-1111-111111111111'),6::bigint,'disabled visitor did not increment');
delete from public.showcase_sites where id='bd111111-1111-1111-1111-111111111111';
select is((select count(*) from public.showcase_visit_counts where site_id='bd111111-1111-1111-1111-111111111111'),0::bigint,'site deletion cleans aggregate');
select is((select count(*) from public.showcase_visit_checkpoints where site_id='bd111111-1111-1111-1111-111111111111'),0::bigint,'site deletion cleans checkpoints');
select * from finish();
rollback;
