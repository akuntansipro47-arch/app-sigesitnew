-- Food Inspection Results Module: Add E-Coli to samples JSONB
-- Adds "e_coli": "Positif" | "Negatif" to each food sample.
-- Safe to run multiple times (idempotent).

-- Backfill existing samples with e_coli field (safe, idempotent)
UPDATE public.food_inspection_results
SET samples = (
  SELECT jsonb_agg(
    jsonb_set(
      COALESCE(sample, '{}'::jsonb),
      '{e_coli}',
      COALESCE(sample->'e_coli', 'null'::jsonb),
      true
    )
  )
  FROM jsonb_array_elements(food_inspection_results.samples) AS sample
)
WHERE samples IS NOT NULL AND samples <> '[]'::jsonb;
