alter table public.rw drop constraint if exists rw_kelurahan_id_fkey;
alter table public.rw add constraint rw_kelurahan_id_fkey foreign key (kelurahan_id) references public.kelurahan(id) on delete restrict;

alter table public.rt drop constraint if exists rt_rw_id_fkey;
alter table public.rt add constraint rt_rw_id_fkey foreign key (rw_id) references public.rw(id) on delete restrict;

drop policy if exists "authenticated users manage kelurahan" on public.kelurahan;
drop policy if exists "authenticated users manage rw" on public.rw;
drop policy if exists "authenticated users manage rt" on public.rt;
create policy "authenticated users manage kelurahan" on public.kelurahan for all to authenticated using (true) with check (true);
create policy "authenticated users manage rw" on public.rw for all to authenticated using (true) with check (true);
create policy "authenticated users manage rt" on public.rt for all to authenticated using (true) with check (true);

create policy "anonymous users read kelurahan" on public.kelurahan for select to anon using (true);
create policy "anonymous users create kelurahan" on public.kelurahan for insert to anon with check (true);
create policy "anonymous users update kelurahan" on public.kelurahan for update to anon using (true) with check (true);
create policy "anonymous users delete kelurahan" on public.kelurahan for delete to anon using (true);
create policy "anonymous users read rw" on public.rw for select to anon using (true);
create policy "anonymous users create rw" on public.rw for insert to anon with check (true);
create policy "anonymous users update rw" on public.rw for update to anon using (true) with check (true);
create policy "anonymous users delete rw" on public.rw for delete to anon using (true);
create policy "anonymous users read rt" on public.rt for select to anon using (true);
create policy "anonymous users create rt" on public.rt for insert to anon with check (true);
create policy "anonymous users update rt" on public.rt for update to anon using (true) with check (true);
create policy "anonymous users delete rt" on public.rt for delete to anon using (true);
