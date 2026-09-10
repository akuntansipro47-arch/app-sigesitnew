-- Add samples JSONB column to support multi-sample food inspection results.
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS).

ALTER TABLE public.food_inspection_results 
ADD COLUMN IF NOT EXISTS samples JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single-sample data to samples array (idempotent)
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
  AND (samples IS NULL OR samples = '[]'::jsonb);

-- Index for JSONB samples
CREATE INDEX IF NOT EXISTS idx_food_inspection_samples ON public.food_inspection_results USING GIN (samples);