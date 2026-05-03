alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists free_forever boolean default false;

alter table public.orders add column if not exists coupon_code text default '';
alter table public.orders add column if not exists discount numeric(12,2) default 0;

create table if not exists public.support_tickets (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  type text default 'melhoria',
  title text not null,
  message text not null,
  status text default 'aberto',
  admin_note text default '',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.coupons (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  code text not null,
  type text default 'percent',
  value numeric(12,2) not null,
  active boolean default true,
  max_uses integer,
  used_count integer default 0,
  expires_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(user_id, code)
);

create table if not exists public.ai_logs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  area text default 'merchant',
  prompt text not null,
  response text not null,
  created_at timestamp default now()
);

create index if not exists idx_support_user_created on public.support_tickets(user_id, created_at desc);
create index if not exists idx_coupons_user_code on public.coupons(user_id, code);
create index if not exists idx_ai_logs_user_created on public.ai_logs(user_id, created_at desc);
