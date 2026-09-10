-- Food Inspection Results Module: Add E-Coli result column
-- Adds dedicated e_coli_result column for Table Editor visibility and legacy compatibility.
-- Safe to run multiple times (idempotent).

ALTER TABLE public.food_inspection_results
ADD COLUMN IF NOT EXISTS e_coli_result text check (e_coli_result in ('Positif', 'Negatif'));

-- Backfill e_coli_result from existing samples JSONB (first sample)
UPDATE public.food_inspection_results
SET e_coli_result = samples->0->>'e_coli'
WHERE samples IS NOT NULL
  AND jsonb_array_length(samples) > 0
    AND samples->0->>'e_coli' IN ('Positif', 'Negatif')
      AND e_coli_result IS NULL;
      