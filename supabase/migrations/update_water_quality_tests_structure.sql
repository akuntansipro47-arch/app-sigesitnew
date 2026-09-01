-- Migration script to update water_quality_tests table structure
-- This script adds separate fields for water and air temperature with their own units

-- Add new columns for water and air temperature with separate units
ALTER TABLE water_quality_tests 
ADD COLUMN IF NOT EXISTS water_temperature_value NUMERIC,
ADD COLUMN IF NOT EXISTS water_temperature_unit TEXT DEFAULT 'C',
ADD COLUMN IF NOT EXISTS air_temperature_value NUMERIC,
ADD COLUMN IF NOT EXISTS air_temperature_unit TEXT DEFAULT 'C';

-- Migrate existing data from old columns to new columns
UPDATE water_quality_tests 
SET 
  water_temperature_value = temperature_value,
  water_temperature_unit = temperature_unit,
  air_temperature_value = NULL,
  air_temperature_unit = 'C'
WHERE temperature_value IS NOT NULL;

-- Drop old columns after migration
ALTER TABLE water_quality_tests 
DROP COLUMN IF EXISTS temperature_value,
DROP COLUMN IF EXISTS temperature_unit;

-- Add comments to document the new structure
COMMENT ON COLUMN water_quality_tests.water_temperature_value IS 'Water temperature measurement value';
COMMENT ON COLUMN water_quality_tests.water_temperature_unit IS 'Water temperature unit (K, C, F, R)';
COMMENT ON COLUMN water_quality_tests.air_temperature_value IS 'Air temperature measurement value';
COMMENT ON COLUMN water_quality_tests.air_temperature_unit IS 'Air temperature unit (K, C, F, R)';
