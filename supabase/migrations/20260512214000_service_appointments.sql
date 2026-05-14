alter table public.orders
  add column if not exists appointment_date text default '',
  add column if not exists appointment_time text default '',
  add column if not exists appointment_end_time text default '',
  add column if not exists appointment_duration_minutes integer default 0;

create index if not exists orders_service_appointment_idx
  on public.orders (user_id, appointment_date, appointment_time);
