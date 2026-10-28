create table public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  request_token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'issued', 'cancelled')),
  encrypted_password text,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  issued_at timestamptz,
  reviewed_by uuid references public.profiles(user_id) on delete set null
);

create index password_reset_requests_pending_idx
on public.password_reset_requests(status, expires_at, requested_at);

create index password_reset_requests_user_idx
on public.password_reset_requests(user_id, requested_at desc);

alter table public.password_reset_requests enable row level security;

revoke all on table public.password_reset_requests from anon, authenticated;
