alter table public.users add column if not exists cover_url text default '';
alter table public.users add column if not exists theme_primary text default '#dc2626';
alter table public.users add column if not exists theme_secondary text default '#111827';
alter table public.users add column if not exists theme_accent text default '#ffffff';
alter table public.users add column if not exists active boolean default true;
alter table public.users add column if not exists last_login_at timestamp;

alter table public.products add column if not exists stock integer default 1;
alter table public.products add column if not exists unlimited_stock boolean default true;

create table if not exists public.orders (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  customer_name text not null,
  customer_whatsapp text not null,
  payment_method text default 'pix',
  notes text default '',
  items text not null default '[]',
  total numeric(12,2) not null,
  status text default 'pendente',
  whatsapp_clicked_at timestamp default now(),
  confirmed_at timestamp,
  canceled_at timestamp,
  created_at timestamp default now()
);

create index if not exists idx_orders_user_status_created on public.orders(user_id, status, created_at desc);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
