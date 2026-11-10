-- Server-only quota for public signup and password-reset actions.
-- A persistent, atomic counter works across Vercel instances.
create table if not exists private.public_request_quotas (
  action text not null check (action in ('signup_ip', 'reset_ip', 'reset_login')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null default now(),
  attempts integer not null default 1 check (attempts > 0),
  primary key (action, subject_hash)
);

alter table private.public_request_quotas enable row level security;
revoke all on table private.public_request_quotas from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update on table private.public_request_quotas to service_role;

create or replace function public.consume_public_request_quota(
  p_action text,
  p_subject_hash text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  now_at timestamptz := pg_catalog.clock_timestamp();
  attempt_count integer;
begin
  if p_action not in ('signup_ip', 'reset_ip', 'reset_login')
    or p_subject_hash is null
    or p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_max_attempts not between 1 and 100
    or p_window_seconds not between 1 and 86400
  then
    raise exception 'INVALID_PUBLIC_REQUEST_QUOTA_ARGUMENTS';
  end if;

  insert into private.public_request_quotas as q
    (action, subject_hash, window_start, attempts)
  values (p_action, p_subject_hash, now_at, 1)
  on conflict (action, subject_hash) do update
  set
    attempts = case
      when q.window_start <= now_at - pg_catalog.make_interval(secs => p_window_seconds)
        then 1
      else least(q.attempts + 1, p_max_attempts + 1)
    end,
    window_start = case
      when q.window_start <= now_at - pg_catalog.make_interval(secs => p_window_seconds)
        then now_at
      else q.window_start
    end
  returning attempts into attempt_count;

  return attempt_count <= p_max_attempts;
end;
$$;

revoke all on function public.consume_public_request_quota(text, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_public_request_quota(text, text, integer, integer)
to service_role;
