begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

select has_table('public', 'browser_notification_preferences', 'browser notification preferences table exists');
select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.browser_notification_preferences')), false),
  'browser notification preferences has RLS enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.browser_notification_preferences', 'SELECT')
  and has_table_privilege('authenticated', 'public.browser_notification_preferences', 'INSERT')
  and has_table_privilege('authenticated', 'public.browser_notification_preferences', 'UPDATE')
  and has_table_privilege('authenticated', 'public.browser_notification_preferences', 'DELETE'),
  'authenticated users can use preference rows subject to RLS'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'browser_notification_preferences'
      and policyname = 'browser_notification_preferences_select_self'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'browser_notification_preferences'
      and policyname = 'browser_notification_preferences_insert_self'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'browser_notification_preferences'
      and policyname = 'browser_notification_preferences_update_self'
  ),
  'preference policies restrict reads and writes to self'
);

select has_table('public', 'admin_notification_events', 'admin notification events table exists');
select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.admin_notification_events')), false),
  'admin notification events has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'public.admin_notification_events', 'SELECT')
  and has_table_privilege('authenticated', 'public.admin_notification_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.admin_notification_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.admin_notification_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.admin_notification_events', 'DELETE'),
  'admin notification events are authenticated read-only subject to admin RLS'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_notification_events'
      and policyname = 'admin_notification_events_select_admin'
  ),
  'admin event select policy exists'
);
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_notification_events'
  ),
  'admin events are published to realtime'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'admin_notification_events'
      and column_name in ('password', 'encrypted_password', 'request_token_hash')
  ),
  'admin realtime events contain no password or reset-token material'
);

select * from finish();
rollback;
