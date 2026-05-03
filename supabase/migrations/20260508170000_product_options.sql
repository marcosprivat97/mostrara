alter table public.products
  add column if not exists options text default '[]';

update public.products
set options = '[]'
where options is null or options = '';
