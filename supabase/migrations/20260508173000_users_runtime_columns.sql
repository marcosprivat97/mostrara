alter table public.users
  add column if not exists plan text default 'free',
  add column if not exists free_forever boolean default false,
  add column if not exists active boolean default true,
  add column if not exists onboarding_completed_at timestamp,
  add column if not exists last_login_at timestamp;

update public.users
set
  plan = coalesce(nullif(plan, ''), 'free'),
  free_forever = coalesce(free_forever, false),
  active = coalesce(active, true);
