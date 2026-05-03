drop policy if exists "Admin can update config" on public.config;
create policy "Admin can update config"
on public.config for update
using ((auth.jwt() ->> 'email') = 'sevenbeatx@gmail.com')
with check ((auth.jwt() ->> 'email') = 'sevenbeatx@gmail.com');
