-- Tabel Lokasi untuk modul pemeriksaan air dan udara
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  kelurahan_id UUID REFERENCES kelurahan(id),
  rw_id UUID REFERENCES rw(id),
  rt_id UUID REFERENCES rt(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabel Hasil Uji Pemeriksaan Air
CREATE TABLE IF NOT EXISTS water_quality_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  officer_id UUID REFERENCES profiles(id),
  
  -- Parameter Fisik
  temperature_value DECIMAL(10, 2),
  temperature_unit TEXT NOT NULL CHECK (temperature_unit IN ('K', 'C', 'F', 'R')),
  tds_value DECIMAL(10, 2),
  turbidity_value DECIMAL(10, 2),
  color_value TEXT,
  odor_value TEXT,
  
  -- Parameter Kimia
  ph_value DECIMAL(10, 2),
  nitrite_value DECIMAL(10, 2),
  nitrate_value DECIMAL(10, 2),
  chromium_value DECIMAL(10, 2),
  iron_value DECIMAL(10, 2),
  manganese_value DECIMAL(10, 2),
  chlorine_value DECIMAL(10, 2),
  fluoride_value DECIMAL(10, 2),
  aluminum_value DECIMAL(10, 2),
  
  -- Parameter Mikrobiologi
  e_coli_value DECIMAL(10, 2),
  coliform_value DECIMAL(10, 2),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_water_quality_tests_updated_at BEFORE UPDATE ON water_quality_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tabel Hasil Uji Kualitas Udara
CREATE TABLE IF NOT EXISTS air_quality_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  officer_id UUID REFERENCES profiles(id),
  
  -- Parameter Udara (3 kolom untuk setiap parameter)
  temperature_1 DECIMAL(10, 2),
  temperature_2 DECIMAL(10, 2),
  temperature_3 DECIMAL(10, 2),
  temperature_unit TEXT NOT NULL CHECK (temperature_unit IN ('K', 'C', 'F', 'R')),
  
  humidity_1 DECIMAL(10, 2),
  humidity_2 DECIMAL(10, 2),
  humidity_3 DECIMAL(10, 2),
  
  noise_1 DECIMAL(10, 2),
  noise_2 DECIMAL(10, 2),
  noise_3 DECIMAL(10, 2),
  
  lighting_1 DECIMAL(10, 2),
  lighting_2 DECIMAL(10, 2),
  lighting_3 DECIMAL(10, 2),
  
  pm25_1 DECIMAL(10, 2),
  pm25_2 DECIMAL(10, 2),
  pm25_3 DECIMAL(10, 2),
  
  pm10_1 DECIMAL(10, 2),
  pm10_2 DECIMAL(10, 2),
  pm10_3 DECIMAL(10, 2),
  
  ventilation_rate_1 DECIMAL(10, 2),
  ventilation_rate_2 DECIMAL(10, 2),
  ventilation_rate_3 DECIMAL(10, 2),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_air_quality_tests_updated_at BEFORE UPDATE ON air_quality_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_locations_kelurahan ON locations(kelurahan_id);
CREATE INDEX IF NOT EXISTS idx_water_quality_tests_location ON water_quality_tests(location_id);
CREATE INDEX IF NOT EXISTS idx_water_quality_tests_date ON water_quality_tests(test_date);
CREATE INDEX IF NOT EXISTS idx_air_quality_tests_location ON air_quality_tests(location_id);
CREATE INDEX IF NOT EXISTS idx_air_quality_tests_date ON air_quality_tests(test_date);

-- RLS Policies
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_quality_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE air_quality_tests ENABLE ROW LEVEL SECURITY;

-- Policy untuk locations
CREATE POLICY "Locations are viewable by authenticated users" 
  ON locations FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Locations can be created by authenticated users" 
  ON locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Locations can be updated by authenticated users" 
  ON locations FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Locations can be deleted by authenticated users" 
  ON locations FOR DELETE USING (auth.role() = 'authenticated');

-- Policy untuk water_quality_tests
CREATE POLICY "Water quality tests are viewable by authenticated users" 
  ON water_quality_tests FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Water quality tests can be created by authenticated users" 
  ON water_quality_tests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Water quality tests can be updated by authenticated users" 
  ON water_quality_tests FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Water quality tests can be deleted by authenticated users" 
  ON water_quality_tests FOR DELETE USING (auth.role() = 'authenticated');

-- Policy untuk air_quality_tests
CREATE POLICY "Air quality tests are viewable by authenticated users" 
  ON air_quality_tests FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Air quality tests can be created by authenticated users" 
  ON air_quality_tests FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Air quality tests can be updated by authenticated users" 
  ON air_quality_tests FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Air quality tests can be deleted by authenticated users" 
  ON air_quality_tests FOR DELETE USING (auth.role() = 'authenticated');
