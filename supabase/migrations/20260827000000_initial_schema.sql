create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin', 'kader');

create table public.pkm_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  responsible_person text,
  website text,
  instagram text,
  facebook text,
  twitter text,
  logo_url text,
  updated_at timestamptz not null default now()
);

create table public.kelurahan (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text unique not null
);
create table public.rw (
  id uuid primary key default gen_random_uuid(),
  kelurahan_id uuid not null references public.kelurahan(id) on delete restrict,
  number text not null,
  unique (kelurahan_id, number)
);
create table public.rt (
  id uuid primary key default gen_random_uuid(),
  rw_id uuid not null references public.rw(id) on delete restrict,
  number text not null,
  unique (rw_id, number)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nik char(16) unique not null,
  phone text not null,
  full_name text not null,
  username text unique not null,
  role public.app_role not null default 'kader',
  kelurahan_id uuid references public.kelurahan(id),
  rw_id uuid references public.rw(id),
  rt_id uuid references public.rt(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.household_entries (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint generated always as identity unique,
  entry_date date not null default current_date,
  officer_id uuid not null references public.profiles(id),
  kelurahan_id uuid not null references public.kelurahan(id),
  rw_id uuid not null references public.rw(id),
  rt_id uuid not null references public.rt(id),
  address text not null,
  resident_count integer not null check (resident_count >= 0),
  permanent_resident_count integer not null check (permanent_resident_count >= 0),
  toilet_count integer check (toilet_count >= 0),
  sync_status text not null default 'synced' check (sync_status in ('synced', 'pending')),
  created_at timestamptz not null default now()
);

create table public.household_cards (
  id uuid primary key default gen_random_uuid(),
  household_entry_id uuid not null references public.household_entries(id) on delete cascade,
  card_sequence smallint not null check (card_sequence between 1 and 20),
  family_card_number char(16) not null,
  questionnaire jsonb not null default '{}'::jsonb,
  unique (household_entry_id, card_sequence),
  unique (family_card_number)
);

alter table public.pkm_profiles enable row level security;
alter table public.kelurahan enable row level security;
alter table public.rw enable row level security;
alter table public.rt enable row level security;
alter table public.profiles enable row level security;
alter table public.household_entries enable row level security;
alter table public.household_cards enable row level security;

create policy "authenticated users read master data" on public.kelurahan for select to authenticated using (true);
create policy "authenticated users read rw" on public.rw for select to authenticated using (true);
create policy "authenticated users read rt" on public.rt for select to authenticated using (true);
create policy "authenticated users manage kelurahan" on public.kelurahan for all to authenticated using (true) with check (true);
create policy "authenticated users manage rw" on public.rw for all to authenticated using (true) with check (true);
create policy "authenticated users manage rt" on public.rt for all to authenticated using (true) with check (true);
create policy "officers see their own entries" on public.household_entries for select to authenticated using (officer_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'));
create policy "officers create own entries" on public.household_entries for insert to authenticated with check (officer_id = auth.uid());
create policy "officers see their household cards" on public.household_cards for select to authenticated using (exists (select 1 from public.household_entries e where e.id = household_entry_id and (e.officer_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin'))));
create policy "officers create cards for own entries" on public.household_cards for insert to authenticated with check (exists (select 1 from public.household_entries e where e.id = household_entry_id and e.officer_id = auth.uid()));
