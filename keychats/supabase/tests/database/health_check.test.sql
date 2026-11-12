begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select has_function('public', 'keychats_health_check', array[]::text[], 'health RPC exists');
select ok(has_function_privilege('anon', 'public.keychats_health_check()', 'EXECUTE'), 'anon may call health RPC');
select ok(not has_function_privilege('authenticated', 'public.keychats_health_check()', 'EXECUTE'), 'health RPC is scoped to anon');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'health RPC does not open private tables to anon');

set local role anon;
select is(public.keychats_health_check(), true, 'anonymous health probe returns only true');
reset role;

select * from finish();
rollback;
