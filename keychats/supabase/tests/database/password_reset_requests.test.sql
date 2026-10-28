begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select has_table('public', 'password_reset_requests', 'password_reset_requests table exists');
select has_column('public', 'password_reset_requests', 'request_token_hash', 'request token hash exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.password_reset_requests'::regclass),
  'password_reset_requests has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.password_reset_requests', 'SELECT')
  and not has_table_privilege('authenticated', 'public.password_reset_requests', 'SELECT')
  and not has_table_privilege('authenticated', 'public.password_reset_requests', 'INSERT')
  and not has_table_privilege('authenticated', 'public.password_reset_requests', 'UPDATE'),
  'password reset requests are server-only'
);
select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'password_reset_requests'
      and indexname = 'password_reset_requests_pending_idx'
  ),
  'pending request index exists'
);

select * from finish();
rollback;
