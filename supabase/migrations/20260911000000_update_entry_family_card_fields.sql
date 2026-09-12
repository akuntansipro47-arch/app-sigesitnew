ALTER TABLE public.family_cards
ADD COLUMN IF NOT EXISTS nik_kepala_keluarga text;

UPDATE public.family_cards
SET nik_kepala_keluarga = ''
WHERE nik_kepala_keluarga IS NULL;

ALTER TABLE public.family_cards
ALTER COLUMN nik_kepala_keluarga SET DEFAULT '';

ALTER TABLE public.family_cards
ALTER COLUMN nik_kepala_keluarga SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'family_cards'
      AND column_name = 'kepala_keluarga'
  ) THEN
    ALTER TABLE public.family_cards
      ALTER COLUMN kepala_keluarga SET DEFAULT '';
  END IF;
END $$;

UPDATE public.family_cards
SET kk_number = regexp_replace(kk_number, '[^0-9]', '', 'g');

UPDATE public.family_cards
SET kk_number = left(kk_number, 16)
WHERE length(kk_number) > 16;

DO $$
DECLARE
  invalid_kk bigint;
BEGIN
  SELECT count(*) INTO invalid_kk
  FROM public.family_cards
  WHERE kk_number !~ '^[0-9]{1,16}$';

  IF invalid_kk > 0 THEN
    RAISE EXCEPTION 'public.family_cards has % kk_number values that cannot be cleaned to 1-16 digits', invalid_kk;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.family_cards'::regclass
      AND conname = 'family_cards_kk_number_numeric_check'
  ) THEN
    ALTER TABLE public.family_cards
      ADD CONSTRAINT family_cards_kk_number_numeric_check
      CHECK (kk_number ~ '^[0-9]{1,16}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.family_cards'::regclass
      AND conname = 'family_cards_nik_kepala_keluarga_numeric_check'
  ) THEN
    ALTER TABLE public.family_cards
      ADD CONSTRAINT family_cards_nik_kepala_keluarga_numeric_check
      CHECK (nik_kepala_keluarga = '' OR nik_kepala_keluarga ~ '^[0-9]{1,16}$');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
