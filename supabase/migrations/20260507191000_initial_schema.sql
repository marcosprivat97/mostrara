create table if not exists public.users (
  id text primary key,
  store_name text not null,
  owner_name text not null,
  email text not null unique,
  password_hash text not null,
  phone text not null,
  whatsapp text not null,
  store_slug text not null unique,
  description text default '',
  city text default 'Rio de Janeiro',
  logo_url text default '',
  active boolean default true,
  created_at timestamp default now()
);

create table if not exists public.products (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  name text not null,
  category text default 'iPhone',
  storage text default '',
  price real not null,
  condition text default 'Vitrine',
  battery text default '',
  warranty text default '',
  status text default 'disponivel',
  description text default '',
  photos text default '[]',
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists public.sales (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  product_id text,
  product_name text not null,
  customer_name text not null,
  customer_whatsapp text default '',
  sale_date date not null,
  product_price real not null,
  amount_paid real not null,
  payment_method text default 'pix',
  notes text default '',
  created_at timestamp default now()
);

create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_user_status_idx on public.products(user_id, status);
create index if not exists products_created_at_idx on public.products(created_at desc);
create index if not exists sales_user_id_idx on public.sales(user_id);
create index if not exists sales_user_sale_date_idx on public.sales(user_id, sale_date desc);
