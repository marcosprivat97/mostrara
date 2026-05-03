alter table public.orders
  add column if not exists delivery_method text default 'delivery',
  add column if not exists cep text default '',
  add column if not exists street text default '',
  add column if not exists number text default '',
  add column if not exists complement text default '',
  add column if not exists neighborhood text default '',
  add column if not exists city text default '',
  add column if not exists state text default '',
  add column if not exists reference text default '';

update public.orders
set
  delivery_method = coalesce(nullif(delivery_method, ''), 'delivery'),
  cep = coalesce(cep, ''),
  street = coalesce(street, ''),
  number = coalesce(number, ''),
  complement = coalesce(complement, ''),
  neighborhood = coalesce(neighborhood, ''),
  city = coalesce(city, ''),
  state = coalesce(state, ''),
  reference = coalesce(reference, '');
