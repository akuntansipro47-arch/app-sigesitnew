-- Food Inspection Results Module: "Hasil Pemeriksaan Pangan/Makanan"

-- Table: food_inspection_results
create table if not exists public.food_inspection_results (
  id uuid primary key default gen_random_uuid(),
  entry_number integer not null,
  entry_date date not null default current_date,
  entry_day text,
  jenis_tpp_id uuid references public.group_tpp(id) on delete set null,
  address text,
  kelurahan_id uuid references public.kelurahan(id) on delete set null,
  rw_id uuid references public.rw(id) on delete set null,
  rt_id uuid references public.rt(id) on delete set null,
  penanggung_jawab text,
  phone text,
  hasil_ikl text check (hasil_ikl in ('MMS', 'TMS')),
  sample_type text,
  boraks_result text check (boraks_result in ('Positif', 'Negatif')),
  formalin_result text check (formalin_result in ('Positif', 'Negatif')),
  rodamin_b_result text check (rodamin_b_result in ('Positif', 'Negatif')),
  metanil_yellow_result text check (metanil_yellow_result in ('Positif', 'Negatif')),
  keterangan text,
  officer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-generate entry_number (sequential 1, 2, 3, ...) before insert
create or replace function public.set_food_inspection_entry_number()
returns trigger as $$
begin
  if new.entry_number is null then
    select coalesce(max(entry_number), 0) + 1 into new.entry_number
    from public.food_inspection_results
    where date_trunc('year', entry_date) = date_trunc('year', new.entry_date);
    if new.entry_number is null then
      new.entry_number := 1;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_food_inspection_entry_number on public.food_inspection_results;
create trigger trg_food_inspection_entry_number
  before insert on public.food_inspection_results
  for each row
  execute function public.set_food_inspection_entry_number();

-- Auto-update updated_at trigger
create or replace function public.update_food_inspection_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_food_inspection_updated_at on public.food_inspection_results;
create trigger trg_food_inspection_updated_at
  before update on public.food_inspection_results
  for each row
  execute function public.update_food_inspection_updated_at();

-- RLS
alter table public.food_inspection_results enable row level security;

create policy "Authenticated users can read food_inspection_results"
  on public.food_inspection_results for select
  to authenticated
  using (true);

create policy "Authenticated users can insert food_inspection_results"
  on public.food_inspection_results for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update food_inspection_results"
  on public.food_inspection_results for update
  to authenticated
  using (true);

create policy "Authenticated users can delete food_inspection_results"
  on public.food_inspection_results for delete
  to authenticated
  using (true);

-- Indexes for performance
create index if not exists idx_food_inspection_officer_id on public.food_inspection_results(officer_id);
create index if not exists idx_food_inspection_entry_date on public.food_inspection_results(entry_date);
create index if not exists idx_food_inspection_jenis_tpp_id on public.food_inspection_results(jenis_tpp_id);
create index if not exists idx_food_inspection_kelurahan_id on public.food_inspection_results(kelurahan_id);
