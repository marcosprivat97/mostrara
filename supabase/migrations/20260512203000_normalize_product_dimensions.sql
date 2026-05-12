alter table public.products
  add column if not exists width numeric(10,2),
  add column if not exists height numeric(10,2),
  add column if not exists length numeric(10,2),
  add column if not exists weight numeric(10,2);

alter table public.products
  alter column width type numeric(10,2)
    using case
      when nullif(trim(width::text), '') is null then null
      when trim(width::text) ~ '^-?[0-9]+([.][0-9]+)?$' then trim(width::text)::numeric(10,2)
      else null
    end,
  alter column height type numeric(10,2)
    using case
      when nullif(trim(height::text), '') is null then null
      when trim(height::text) ~ '^-?[0-9]+([.][0-9]+)?$' then trim(height::text)::numeric(10,2)
      else null
    end,
  alter column length type numeric(10,2)
    using case
      when nullif(trim(length::text), '') is null then null
      when trim(length::text) ~ '^-?[0-9]+([.][0-9]+)?$' then trim(length::text)::numeric(10,2)
      else null
    end,
  alter column weight type numeric(10,2)
    using case
      when nullif(trim(weight::text), '') is null then null
      when trim(weight::text) ~ '^-?[0-9]+([.][0-9]+)?$' then trim(weight::text)::numeric(10,2)
      else null
    end;

alter table public.products
  alter column width set default 11,
  alter column height set default 2,
  alter column length set default 16,
  alter column weight set default 0.3;

update public.products
set width = 11
where width is null or width <= 0;

update public.products
set height = 2
where height is null or height <= 0;

update public.products
set length = 16
where length is null or length <= 0;

update public.products
set weight = 0.3
where weight is null or weight <= 0;
