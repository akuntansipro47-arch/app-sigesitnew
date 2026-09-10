-- Food Inspection Results Module: Updated with multi-sample support
-- This migration adds samples JSONB column to support multiple food samples per inspection

-- Add samples column to store array of food samples
ALTER TABLE public.food_inspection_results 
ADD COLUMN IF NOT EXISTS samples JSONB DEFAULT '[]'::jsonb;

-- Sample structure:
-- [
--   {
--     "jenis_makanan": "string",
--     "boraks": "Positif" | "Negatif",
--     "formalin": "Positif" | "Negatif", 
--     "rodamin_b": "Positif" | "Negatif",
--     "metanil_yellow": "Positif" | "Negatif",
--     "e_coli": "Positif" | "Negatif",
--     "keterangan": "string"
--   }
-- ]

-- Migrate existing single-sample data to samples array
UPDATE public.food_inspection_results
SET samples = jsonb_build_array(
  jsonb_build_object(
    'jenis_makanan', COALESCE(sample_type, ''),
    'boraks', COALESCE(boraks_result, ''),
    'formalin', COALESCE(formalin_result, ''),
    'rodamin_b', COALESCE(rodamin_b_result, ''),
    'metanil_yellow', COALESCE(metanil_yellow_result, ''),
    'keterangan', COALESCE(keterangan, '')
  )
)
WHERE (sample_type IS NOT NULL OR boraks_result IS NOT NULL OR formalin_result IS NOT NULL 
       OR rodamin_b_result IS NOT NULL OR metanil_yellow_result IS NOT NULL OR keterangan IS NOT NULL)
  AND samples = '[]'::jsonb;

-- Index for JSONB samples
CREATE INDEX IF NOT EXISTS idx_food_inspection_samples ON public.food_inspection_results USING GIN (samples);