-- Tabel PKM Profile untuk informasi PKM
CREATE TABLE IF NOT EXISTS pkm_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_pkm TEXT NOT NULL,
  alamat_pkm TEXT NOT NULL,
  no_telepon TEXT NOT NULL,
  penanggung_jawab TEXT NOT NULL,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  twitter TEXT,
  logo_url TEXT,
  logo_storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger untuk updated_at
DROP TRIGGER IF EXISTS update_pkm_info_updated_at ON pkm_info;
CREATE TRIGGER update_pkm_info_updated_at BEFORE UPDATE ON pkm_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket untuk logo PKM
-- Note: Bucket creation might need to be done manually in Supabase Dashboard
-- This is the SQL reference for the bucket
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pkm-logos') THEN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('pkm-logos', 'pkm-logos', true);
  END IF;
END $$;

-- RLS untuk storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for pkm logos" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'pkm-logos');

CREATE POLICY "Authenticated upload for pkm logos" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'pkm-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update for pkm logos" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'pkm-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete for pkm logos" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'pkm-logos' AND auth.role() = 'authenticated');

-- RLS untuk pkm_info
ALTER TABLE pkm_info ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "PKM info is viewable by authenticated users" ON pkm_info;
  CREATE POLICY "PKM info is viewable by authenticated users" 
    ON pkm_info FOR SELECT USING (auth.role() = 'authenticated');
  
  DROP POLICY IF EXISTS "PKM info can be updated by authenticated users" ON pkm_info;
  CREATE POLICY "PKM info can be updated by authenticated users" 
    ON pkm_info FOR UPDATE USING (auth.role() = 'authenticated');
  
  DROP POLICY IF EXISTS "PKM info can be created by authenticated users" ON pkm_info;
  CREATE POLICY "PKM info can be created by authenticated users" 
    ON pkm_info FOR INSERT WITH CHECK (auth.role() = 'authenticated');
END $$;

-- Insert default PKM info jika belum ada
INSERT INTO pkm_info (nama_pkm, alamat_pkm, no_telepon, penanggung_jawab, website, instagram, facebook, twitter)
VALUES (
  'PKM Padasuka',
  'Jl. Padasuka No. 123, Bandung',
  '022-1234567',
  'Dr. Ahmad Kesehatan',
  'https://pkmpadasuka.id',
  '@pkmpadasuka',
  'PKMPadasuka',
  '@pkmpadasuka'
)
ON CONFLICT DO NOTHING;
