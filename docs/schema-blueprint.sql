-- Blueprint de schema para comparar com o banco atual.
-- Nao aplicar em producao sem migracao planejada.

create extension if not exists pgcrypto;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_name text not null,
  email text not null,
  phone text,
  whatsapp text not null,
  mode text not null check (mode in ('food', 'retail', 'booking')),
  canonical_niche text not null check (
    canonical_niche in (
      'acai',
      'pizzaria',
      'quentinhas',
      'doces',
      'hamburgueria',
      'salgados',
      'celulares',
      'manicure'
    )
  ),
  legacy_niche text,
  description text,
  city text,
  state text,
  address_json jsonb not null default '{}'::jsonb,
  theme_json jsonb not null default '{}'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  plan_code text not null default 'free',
  verified_badge boolean not null default false,
  is_open boolean not null default true,
  plan_started_at timestamptz,
  plan_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stores_mode on public.stores (mode);
create index if not exists idx_stores_canonical_niche on public.stores (canonical_niche);

create table if not exists public.store_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  break_start_at time,
  break_end_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, weekday)
);

create table if not exists public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.catalog_categories(id) on delete set null,
  item_kind text not null check (item_kind in ('product', 'service')),
  name text not null,
  slug text not null,
  description text,
  list_price numeric(12,2) not null,
  sale_price numeric(12,2),
  currency_code text not null default 'BRL',
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'sold_out')),
  cover_image_url text,
  gallery_json jsonb not null default '[]'::jsonb,
  attributes_json jsonb not null default '{}'::jsonb,
  allows_delivery boolean not null default false,
  allows_pickup boolean not null default true,
  allows_booking boolean not null default false,
  duration_minutes integer,
  is_featured boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table if not exists public.item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  name text not null,
  sku text,
  price_delta numeric(12,2) not null default 0,
  stock_on_hand integer,
  duration_minutes integer,
  attributes_json jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_item_variants_item_id on public.item_variants (item_id);

create table if not exists public.item_addons (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id) on delete cascade,
  name text not null,
  selection_mode text not null check (selection_mode in ('single', 'multiple')),
  min_select smallint not null default 0,
  max_select smallint not null default 1,
  is_required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.item_addon_options (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null references public.item_addons(id) on delete cascade,
  name text not null,
  price_delta numeric(12,2) not null default 0,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  item_id uuid references public.catalog_items(id) on delete cascade,
  variant_id uuid references public.item_variants(id) on delete cascade,
  sku text not null,
  stock_on_hand integer not null default 0,
  reserved_quantity integer not null default 0,
  reorder_level integer,
  is_sellable boolean not null default true,
  attributes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, sku)
);

create index if not exists idx_inventory_store_id on public.inventory (store_id);

create table if not exists public.professionals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  role_name text,
  bio text,
  avatar_url text,
  is_active boolean not null default true,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  customer_name text not null,
  customer_whatsapp text not null,
  customer_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'canceled', 'no_show')),
  notes text,
  source text not null default 'storefront' check (source in ('storefront', 'dashboard', 'whatsapp')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_store_id on public.appointments (store_id);
create index if not exists idx_appointments_professional_id on public.appointments (professional_id);
create index if not exists idx_appointments_starts_at on public.appointments (starts_at);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  order_number text not null,
  channel text not null default 'storefront' check (channel in ('storefront', 'dashboard', 'whatsapp')),
  mode_snapshot text not null check (mode_snapshot in ('food', 'retail', 'booking')),
  customer_name text not null,
  customer_whatsapp text not null,
  customer_email text,
  fulfillment_type text not null default 'delivery' check (fulfillment_type in ('delivery', 'pickup', 'booking')),
  payment_method text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'completed', 'canceled')),
  address_json jsonb not null default '{}'::jsonb,
  pricing_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, order_number)
);

create index if not exists idx_orders_store_id on public.orders (store_id);
create index if not exists idx_orders_appointment_id on public.orders (appointment_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid references public.catalog_items(id) on delete set null,
  variant_id uuid references public.item_variants(id) on delete set null,
  item_name text not null,
  variant_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  total_price numeric(12,2) not null,
  selected_addons_json jsonb not null default '[]'::jsonb,
  attributes_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);

