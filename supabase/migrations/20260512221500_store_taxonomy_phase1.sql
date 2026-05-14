alter table public.users
  add column if not exists store_mode text,
  add column if not exists canonical_niche text;

update public.users
set store_mode = case
  when coalesce(store_type, 'celulares') in ('acai', 'hamburgueria', 'pizzaria', 'quentinhas', 'doces', 'salgados', 'pastelaria', 'salgadinhos', 'marmitex') then 'food'
  when coalesce(store_type, 'celulares') in ('manicure', 'salao') then 'booking'
  else 'retail'
end
where store_mode is null or btrim(store_mode) = '';

update public.users
set canonical_niche = case
  when coalesce(store_type, 'celulares') = 'marmitex' then 'quentinhas'
  when coalesce(store_type, 'celulares') in ('pastelaria', 'salgadinhos') then 'salgados'
  when coalesce(store_type, 'celulares') in ('acai', 'pizzaria', 'quentinhas', 'doces', 'hamburgueria', 'salgados', 'celulares', 'manicure') then coalesce(store_type, 'celulares')
  else null
end
where canonical_niche is null or btrim(canonical_niche) = '';

update public.users
set store_mode = 'retail'
where store_mode is null or btrim(store_mode) = '';

alter table public.users
  alter column store_mode set default 'retail',
  alter column store_mode set not null;
