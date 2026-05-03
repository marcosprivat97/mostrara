alter table public.users
  add column if not exists state text default 'RJ',
  add column if not exists store_cep text default '',
  add column if not exists store_address text default '',
  add column if not exists store_address_number text default '',
  add column if not exists store_neighborhood text default '',
  add column if not exists store_latitude text default '',
  add column if not exists store_longitude text default '';

update public.users
set
  state = coalesce(nullif(state, ''), 'RJ'),
  store_cep = coalesce(store_cep, ''),
  store_address = coalesce(store_address, ''),
  store_address_number = coalesce(store_address_number, ''),
  store_neighborhood = coalesce(store_neighborhood, ''),
  store_latitude = coalesce(store_latitude, ''),
  store_longitude = coalesce(store_longitude, '');
