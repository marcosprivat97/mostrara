alter table public.products
  alter column price type numeric(12,2)
  using round(price::numeric, 2);

alter table public.sales
  alter column product_price type numeric(12,2)
  using round(product_price::numeric, 2);

alter table public.sales
  alter column amount_paid type numeric(12,2)
  using round(amount_paid::numeric, 2);

alter table public.products validate constraint products_price_positive;
alter table public.products validate constraint products_status_allowed;
alter table public.sales validate constraint sales_product_price_positive;
alter table public.sales validate constraint sales_amount_paid_positive;
alter table public.sales validate constraint sales_payment_method_allowed;
