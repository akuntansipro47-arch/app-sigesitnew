-- Add kepala_keluarga column to family_cards table
alter table public.family_cards 
add column if not exists kepala_keluarga text;

-- Update existing records with default value
update public.family_cards 
set kepala_keluarga = case 
  when kk_sequence = 1 then 'Kepala Keluarga Utama'
  else null
end
where kepala_keluarga is null;
