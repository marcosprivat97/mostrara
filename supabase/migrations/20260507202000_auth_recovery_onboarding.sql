alter table public.users
  add column if not exists onboarding_completed_at timestamp;

create table if not exists public.password_reset_tokens (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamp not null,
  used_at timestamp,
  created_at timestamp default now()
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens(user_id);

create index if not exists password_reset_tokens_expires_at_idx
  on public.password_reset_tokens(expires_at);
