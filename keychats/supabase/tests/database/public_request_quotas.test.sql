begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('private', 'public_request_quotas', 'private quota table exists');
select has_function('public', 'consume_public_request_quota', array['text','text','integer','integer'], 'quota RPC exists');
select ok(not has_table_privilege('anon', 'private.public_request_quotas', 'SELECT'), 'anonymous users cannot read private counters');
select ok(not has_table_privilege('authenticated', 'private.public_request_quotas', 'SELECT'), 'members cannot read private counters');
select ok(not has_function_privilege('anon', 'public.consume_public_request_quota(text,text,integer,integer)', 'EXECUTE'), 'anonymous users cannot consume quotas directly');
select ok(not has_function_privilege('authenticated', 'public.consume_public_request_quota(text,text,integer,integer)', 'EXECUTE'), 'members cannot consume quotas directly');
select ok(has_function_privilege('service_role', 'public.consume_public_request_quota(text,text,integer,integer)', 'EXECUTE'), 'service role may consume quotas');
select ok((select relrowsecurity from pg_class where oid='private.public_request_quotas'::regclass), 'quota table has RLS enabled');

select is(public.consume_public_request_quota('signup_ip', repeat('a',64), 1, 3600), true, 'first request is permitted');
select is(public.consume_public_request_quota('signup_ip', repeat('a',64), 1, 3600), false, 'second request within window is rejected');

select * from finish();
rollback;
