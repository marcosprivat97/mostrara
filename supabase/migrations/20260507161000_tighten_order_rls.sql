drop policy if exists "Public can insert orders" on public.pedidos;
drop policy if exists "Service role can insert orders" on public.pedidos;
create policy "Service role can insert orders"
on public.pedidos for insert
with check (auth.role() = 'service_role');
