alter table public.products
  add constraint products_price_positive
  check (price > 0) not valid;

alter table public.products
  add constraint products_status_allowed
  check (status in ('disponivel', 'reservado', 'vendido')) not valid;

alter table public.sales
  add constraint sales_product_price_positive
  check (product_price > 0) not valid;

alter table public.sales
  add constraint sales_amount_paid_positive
  check (amount_paid > 0) not valid;

alter table public.sales
  add constraint sales_payment_method_allowed
  check (payment_method in ('pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia')) not valid;
