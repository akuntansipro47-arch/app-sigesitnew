-- Uji Air: ubah kolom numeric menjadi text agar bisa menyimpan nilai seperti >2 atau <10
-- Aman untuk dijalankan berulang: hanya mengubah kolom yang masih bukan bertipe text.

do $$
begin
  -- Jika tabel belum ada di environment tertentu, abaikan.
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'water_quality_tests'
  ) then
    return;
  end if;

  -- Helper: ubah type kolom ke text jika masih bukan text
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='water_temperature_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column water_temperature_value type text using water_temperature_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='air_temperature_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column air_temperature_value type text using air_temperature_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='tds_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column tds_value type text using tds_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='turbidity_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column turbidity_value type text using turbidity_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='ph_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column ph_value type text using ph_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='nitrite_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column nitrite_value type text using nitrite_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='nitrate_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column nitrate_value type text using nitrate_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='chromium_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column chromium_value type text using chromium_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='iron_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column iron_value type text using iron_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='manganese_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column manganese_value type text using manganese_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='chlorine_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column chlorine_value type text using chlorine_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='fluoride_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column fluoride_value type text using fluoride_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='aluminum_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column aluminum_value type text using aluminum_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='e_coli_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column e_coli_value type text using e_coli_value::text;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='coliform_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column coliform_value type text using coliform_value::text;
  end if;

  -- Kolom legacy (jika masih ada)
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='water_quality_tests' and column_name='temperature_value' and data_type <> 'text') then
    alter table public.water_quality_tests alter column temperature_value type text using temperature_value::text;
  end if;
end $$;

