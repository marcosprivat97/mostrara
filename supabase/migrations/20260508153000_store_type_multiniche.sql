alter table public.users
  add column if not exists store_type text not null default 'celulares';

update public.users
set store_type = 'celulares'
where store_type is null or store_type = '';
