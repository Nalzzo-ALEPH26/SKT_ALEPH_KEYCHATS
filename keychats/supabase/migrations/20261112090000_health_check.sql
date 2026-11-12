-- Minimal public health probe. It does not access any application tables or data.
-- PostgREST can invoke this as the anon role using the publishable key.
create or replace function public.keychats_health_check()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

-- Newly created PostgreSQL functions otherwise default to EXECUTE for PUBLIC.
revoke all on function public.keychats_health_check() from public, anon, authenticated;
grant execute on function public.keychats_health_check() to anon;
