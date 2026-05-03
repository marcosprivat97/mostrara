alter table public.users
  add column if not exists mp_access_token text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_user_id text,
  add column if not exists mp_connected_at timestamp,
  add column if not exists mp_access_token_expires_at timestamp,
  add column if not exists mp_refresh_token_expires_at timestamp;

alter table public.orders
  add column if not exists customer_email text default '',
  add column if not exists customer_document text default '',
  add column if not exists payment_provider text default 'whatsapp',
  add column if not exists payment_status text default 'pending',
  add column if not exists mp_payment_id text,
  add column if not exists mp_qr_code text,
  add column if not exists mp_qr_code_base64 text,
  add column if not exists mp_ticket_url text,
  add column if not exists mp_status_detail text,
  add column if not exists paid_at timestamp;

update public.orders
set
  payment_provider = coalesce(nullif(payment_provider, ''), 'whatsapp'),
  payment_status = coalesce(nullif(payment_status, ''), 'pending'),
  customer_email = coalesce(customer_email, ''),
  customer_document = coalesce(customer_document, '');
