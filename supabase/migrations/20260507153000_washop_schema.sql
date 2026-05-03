create extension if not exists pgcrypto;
create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  slug text not null unique,
  whatsapp text,
  descricao text,
  logo_url text,
  capa_url text,
  tipo_negocio text,
  cor_primaria text default '#FF6B35',
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  mercado_pago_id text,
  mercado_pago_status text,
  evolution_instance text,
  evolution_connected boolean not null default false,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (loja_id, nome)
);
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(12,2) not null default 0,
  foto_url text,
  estoque integer not null default 0,
  estoque_ilimitado boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  cliente_nome text not null,
  cliente_whatsapp text not null,
  modalidade text not null check (modalidade in ('entrega', 'retirada')),
  endereco_json jsonb,
  pagamento text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  cupom_codigo text,
  total numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  status text not null default 'Novo',
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.cupons (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  codigo text not null,
  tipo text not null check (tipo in ('porcentagem', 'fixo')),
  valor numeric(12,2) not null,
  ativo boolean not null default true,
  expira_em timestamptz,
  criado_em timestamptz not null default now(),
  unique (loja_id, codigo)
);
create table if not exists public.config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.config (key, value)
values ('monthly_price', '49.99'::jsonb)
on conflict (key) do nothing;
create index if not exists idx_lojas_slug on public.lojas(slug);
create index if not exists idx_lojas_user_id on public.lojas(user_id);
create index if not exists idx_produtos_loja_id on public.produtos(loja_id);
create index if not exists idx_categorias_loja_id on public.categorias(loja_id);
create index if not exists idx_pedidos_loja_id_criado on public.pedidos(loja_id, criado_em desc);
create index if not exists idx_cupons_loja_codigo on public.cupons(loja_id, codigo);
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_lojas_touch on public.lojas;
create trigger trg_lojas_touch before update on public.lojas
for each row execute function public.touch_updated_at();
drop trigger if exists trg_produtos_touch on public.produtos;
create trigger trg_produtos_touch before update on public.produtos
for each row execute function public.touch_updated_at();
drop trigger if exists trg_pedidos_touch on public.pedidos;
create trigger trg_pedidos_touch before update on public.pedidos
for each row execute function public.touch_updated_at();
alter table public.lojas enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.pedidos enable row level security;
alter table public.cupons enable row level security;
alter table public.config enable row level security;
drop policy if exists "Public can read active storefront stores" on public.lojas;
create policy "Public can read active storefront stores"
on public.lojas for select
using (true);
drop policy if exists "Owners manage own stores" on public.lojas;
create policy "Owners manage own stores"
on public.lojas for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
drop policy if exists "Public can read categories" on public.categorias;
create policy "Public can read categories"
on public.categorias for select
using (true);
drop policy if exists "Owners manage own categories" on public.categorias;
create policy "Owners manage own categories"
on public.categorias for all
using (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()));
drop policy if exists "Public can read products" on public.produtos;
create policy "Public can read products"
on public.produtos for select
using (ativo = true);
drop policy if exists "Owners manage own products" on public.produtos;
create policy "Owners manage own products"
on public.produtos for all
using (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()));
drop policy if exists "Owners read own orders" on public.pedidos;
create policy "Owners read own orders"
on public.pedidos for select
using (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()));
drop policy if exists "Public can insert orders" on public.pedidos;
create policy "Public can insert orders"
on public.pedidos for insert
with check (true);
drop policy if exists "Owners update own orders" on public.pedidos;
create policy "Owners update own orders"
on public.pedidos for update
using (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()));
drop policy if exists "Public can read active coupons" on public.cupons;
create policy "Public can read active coupons"
on public.cupons for select
using (ativo = true);
drop policy if exists "Owners manage own coupons" on public.cupons;
create policy "Owners manage own coupons"
on public.cupons for all
using (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()))
with check (exists (select 1 from public.lojas l where l.id = loja_id and l.user_id = auth.uid()));
drop policy if exists "Public can read config" on public.config;
create policy "Public can read config"
on public.config for select
using (true);
insert into storage.buckets (id, name, public)
values ('lojas', 'lojas', true), ('produtos', 'produtos', true)
on conflict (id) do update set public = excluded.public;
drop policy if exists "Public read washop files" on storage.objects;
create policy "Public read washop files"
on storage.objects for select
using (bucket_id in ('lojas', 'produtos'));
drop policy if exists "Authenticated upload washop files" on storage.objects;
create policy "Authenticated upload washop files"
on storage.objects for insert
with check (bucket_id in ('lojas', 'produtos') and auth.role() = 'authenticated');
drop policy if exists "Authenticated update washop files" on storage.objects;
create policy "Authenticated update washop files"
on storage.objects for update
using (bucket_id in ('lojas', 'produtos') and auth.role() = 'authenticated')
with check (bucket_id in ('lojas', 'produtos') and auth.role() = 'authenticated');
drop policy if exists "Authenticated delete washop files" on storage.objects;
create policy "Authenticated delete washop files"
on storage.objects for delete
using (bucket_id in ('lojas', 'produtos') and auth.role() = 'authenticated');
create or replace function public.finalize_onboarding(
  p_user_id uuid,
  p_nome_loja text,
  p_slug text,
  p_whatsapp text,
  p_tipo_negocio text,
  p_logo_url text default null,
  p_capa_url text default null,
  p_produto_nome text default null,
  p_produto_preco numeric default 0,
  p_produto_foto_url text default null,
  p_produto_descricao text default '',
  p_produto_categoria text default 'GERAL'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid;
  v_categoria_id uuid;
begin
  if exists (select 1 from public.lojas where slug = p_slug and user_id <> p_user_id) then
    raise exception 'Este link ja esta em uso.';
  end if;

  insert into public.lojas (
    user_id, nome, slug, whatsapp, tipo_negocio, logo_url, capa_url
  )
  values (
    p_user_id, p_nome_loja, p_slug, p_whatsapp, p_tipo_negocio, p_logo_url, p_capa_url
  )
  on conflict (slug) do update set
    user_id = excluded.user_id,
    nome = excluded.nome,
    whatsapp = excluded.whatsapp,
    tipo_negocio = excluded.tipo_negocio,
    logo_url = excluded.logo_url,
    capa_url = excluded.capa_url
  returning id into v_loja_id;

  insert into public.categorias (loja_id, nome, ordem)
  values (v_loja_id, coalesce(nullif(p_produto_categoria, ''), 'GERAL'), 0)
  on conflict (loja_id, nome) do update set nome = excluded.nome
  returning id into v_categoria_id;

  if p_produto_nome is not null and length(trim(p_produto_nome)) > 0 then
    insert into public.produtos (
      loja_id, categoria_id, nome, descricao, preco, foto_url, estoque_ilimitado
    )
    values (
      v_loja_id,
      v_categoria_id,
      p_produto_nome,
      nullif(p_produto_descricao, ''),
      coalesce(p_produto_preco, 0),
      p_produto_foto_url,
      true
    );
  end if;

  return jsonb_build_object('success', true, 'loja_id', v_loja_id);
end;
$$;
create or replace function public.finalize_checkout_v1(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loja_id uuid := (payload->>'loja_id')::uuid;
  v_cliente_nome text := payload->>'cliente_nome';
  v_cliente_whatsapp text := payload->>'cliente_whatsapp';
  v_modalidade text := payload->>'modalidade';
  v_pagamento text := payload->>'pagamento';
  v_endereco jsonb := payload->'endereco';
  v_cupom_codigo text := nullif(upper(coalesce(payload->>'cupom_codigo', '')), '');
  v_items jsonb := payload->'items';
  v_item jsonb;
  v_product record;
  v_order_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_desconto numeric := 0;
  v_total numeric := 0;
  v_coupon record;
  v_order_id uuid;
begin
  if v_items is null or jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('error', 'Carrinho vazio');
  end if;

  if not exists (select 1 from public.lojas where id = v_loja_id) then
    return jsonb_build_object('error', 'Loja nao encontrada');
  end if;

  for v_item in select * from jsonb_array_elements(v_items)
  loop
    select id, nome, preco, estoque, estoque_ilimitado
      into v_product
      from public.produtos
      where id = (v_item->>'id')::uuid
        and loja_id = v_loja_id
        and ativo = true
      for update;

    if v_product.id is null then
      return jsonb_build_object('error', 'Produto nao encontrado');
    end if;

    if coalesce(v_product.estoque_ilimitado, false) = false
       and coalesce(v_product.estoque, 0) < (v_item->>'quantidade')::int then
      return jsonb_build_object('error', 'Estoque insuficiente para ' || v_product.nome);
    end if;

    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'id', v_product.id,
      'nome', v_product.nome,
      'preco', v_product.preco,
      'quantidade', (v_item->>'quantidade')::int,
      'total', v_product.preco * (v_item->>'quantidade')::int
    ));

    v_subtotal := v_subtotal + (v_product.preco * (v_item->>'quantidade')::int);

    if coalesce(v_product.estoque_ilimitado, false) = false then
      update public.produtos
        set estoque = greatest(0, coalesce(estoque, 0) - (v_item->>'quantidade')::int)
        where id = v_product.id;
    end if;
  end loop;

  if v_cupom_codigo is not null then
    select codigo, tipo, valor, expira_em
      into v_coupon
      from public.cupons
      where loja_id = v_loja_id
        and codigo = v_cupom_codigo
        and ativo = true
      limit 1;

    if v_coupon.codigo is not null
       and (v_coupon.expira_em is null or v_coupon.expira_em >= now()) then
      if v_coupon.tipo = 'porcentagem' then
        v_desconto := v_subtotal * (v_coupon.valor / 100);
      else
        v_desconto := v_coupon.valor;
      end if;
    else
      v_cupom_codigo := null;
    end if;
  end if;

  v_total := greatest(0, v_subtotal - v_desconto);

  insert into public.pedidos (
    loja_id, cliente_nome, cliente_whatsapp, modalidade, endereco_json,
    pagamento, items, subtotal, desconto, cupom_codigo, total, valor_total, status
  )
  values (
    v_loja_id, v_cliente_nome, v_cliente_whatsapp, v_modalidade, v_endereco,
    v_pagamento, v_order_items, v_subtotal, v_desconto, v_cupom_codigo, v_total, v_total, 'Novo'
  )
  returning id into v_order_id;

  return jsonb_build_object(
    'orderId', v_order_id,
    'orderUniqueId', upper(left(v_order_id::text, 8)),
    'total', v_total
  );
end;
$$;
