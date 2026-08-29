alter table public.profiles add column if not exists email text unique;

-- security definer bypasses RLS so this check doesn't recurse into the policies below
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid and role = 'super_admin' and is_active = true
  );
$$;

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "super admins read all profiles" on public.profiles;
create policy "super admins read all profiles" on public.profiles
  for select to authenticated using (public.is_super_admin(auth.uid()));

drop policy if exists "super admins update profiles" on public.profiles;
create policy "super admins update profiles" on public.profiles
  for update to authenticated using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

drop policy if exists "super admins delete profiles" on public.profiles;
create policy "super admins delete profiles" on public.profiles
  for delete to authenticated using (public.is_super_admin(auth.uid()));

-- Note: creating accounts requires the auth.admin API (service role), which the
-- "admin-users" edge function handles. It bypasses RLS via the service role key,
-- so no insert policy is needed here for regular authenticated clients.

-- Bootstrap: after deploying, manually create the first super_admin via the
-- Supabase Studio (Authentication > Users), then run:
--   insert into public.profiles (id, nik, phone, full_name, username, email, role)
--   values ('<auth-user-uuid>', '0000000000000000', '0000000000', 'Admin', 'admin', 'admin@example.com', 'super_admin');
