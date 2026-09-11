ALTER TABLE public.family_cards
ADD COLUMN IF NOT EXISTS kepala_keluarga text;

CREATE OR REPLACE FUNCTION public.set_entry_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
  owner_id uuid;
BEGIN
  IF NEW.entry_number IS NULL OR NEW.entry_number <= 0 THEN
    owner_id := COALESCE(NEW.created_by, NEW.officer_id, auth.uid());
    SELECT COALESCE(MAX(entry_number), 0) + 1
    INTO next_num
    FROM public.entries
    WHERE (owner_id IS NULL OR created_by = owner_id)
      AND date_trunc('year', entry_date) = date_trunc('year', COALESCE(NEW.entry_date, CURRENT_DATE));

    NEW.entry_number := COALESCE(next_num, 1);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entries_set_entry_number ON public.entries;
CREATE TRIGGER entries_set_entry_number
BEFORE INSERT ON public.entries
FOR EACH ROW
EXECUTE FUNCTION public.set_entry_number();

NOTIFY pgrst, 'reload schema';
