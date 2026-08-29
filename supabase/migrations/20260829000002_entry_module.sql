-- Entry Module Database Schema
-- Modul Entry untuk data rumah dan anggota keluarga

-- Table: entries (header entry)
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  entry_number integer not null,
  entry_date date not null default current_date,
  officer_id uuid not null references public.profiles(id) on delete cascade,
  kelurahan_id text not null,
  rw_id text not null,
  rt_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: family_cards (detail per kartu keluarga)
create table if not exists public.family_cards (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  kk_sequence integer not null, -- urutan KK dalam entry (1-20)
  kk_number text not null,
  address text,
  total_jiwa integer,
  jiwa_menetap integer,
  jamban_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(entry_id, kk_sequence)
);

-- Table: questionnaire_responses (jawaban questionnaire)
create table if not exists public.questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  family_card_id uuid not null references public.family_cards(id) on delete cascade,
  pillar text not null, -- 'jamban', 'ctps', 'sumber_air', 'sampah', 'limbah', 'pkurt'
  question_code text not null,
  answer boolean not null,
  created_at timestamptz default now(),
  unique(family_card_id, pillar, question_code)
);

-- RLS Policies
alter table public.entries enable row level security;
alter table public.family_cards enable row level security;
alter table public.questionnaire_responses enable row level security;

-- Policy: officers can read/write their own entries
create policy "officers manage own entries" on public.entries
  for all to authenticated
  using (officer_id = auth.uid())
  with check officer_id = auth.uid();

-- Policy: super admins can manage all entries
create policy "super admins manage all entries" on public.entries
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check public.is_super_admin(auth.uid());

-- Policy: officers can read/write family cards for their entries
create policy "officers manage own family cards" on public.family_cards
  for all to authenticated
  using (exists (
    select 1 from public.entries 
    where entries.id = family_cards.entry_id 
    and entries.officer_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.entries 
    where entries.id = family_cards.entry_id 
    and entries.officer_id = auth.uid()
  ));

-- Policy: super admins can manage all family cards
create policy "super admins manage all family cards" on public.family_cards
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check public.is_super_admin(auth.uid());

-- Policy: officers can read/write questionnaire responses for their family cards
create policy "officers manage own questionnaire responses" on public.questionnaire_responses
  for all to authenticated
  using (exists (
    select 1 from public.family_cards fc
    join public.entries e on e.id = fc.entry_id
    where fc.id = questionnaire_responses.family_card_id
    and e.officer_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.family_cards fc
    join public.entries e on e.id = fc.entry_id
    where fc.id = questionnaire_responses.family_card_id
    and e.officer_id = auth.uid()
  ));

-- Policy: super admins can manage all questionnaire responses
create policy "super admins manage all questionnaire responses" on public.questionnaire_responses
  for all to authenticated
  using (public.is_super_admin(auth.uid()))
  with check public.is_super_admin(auth.uid());

-- Function: Get next entry number for officer
create or replace function public.get_next_entry_number(officer_id uuid)
returns integer as $$
declare
  next_num integer;
begin
  select coalesce(max(entry_number), 0) + 1 into next_num
  from public.entries
  where officer_id = officer_id
  and date_trunc('year', entry_date) = date_trunc('year', current_date);
  return next_num;
end;
$$ language plpgsql;

-- Indexes for performance
create index if not exists idx_entries_officer_id on public.entries(officer_id);
create index if not exists idx_entries_entry_date on public.entries(entry_date);
create index if not exists idx_family_cards_entry_id on public.family_cards(entry_id);
create index if not exists idx_questionnaire_responses_family_card_id on public.questionnaire_responses(family_card_id);
