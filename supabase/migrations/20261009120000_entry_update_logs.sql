-- Fitur indikator & riwayat update di modul Entry Data.
--
-- Menyimpan riwayat PERUBAHAN baris (bukan sekadar "pernah diedit"): kolom apa
-- yang berubah, nilai lama -> baru, kapan, dan oleh siapa. Ditangkap otomatis
-- oleh trigger AFTER UPDATE pada entries, family_cards, dan questionnaire_responses
-- sehingga semua jalur edit (form, import, SQL langsung) ikut tercatat.
-- Catatan: penyimpanan lewat trigger — baris yang dihapus ikut terhapus (ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS public.entry_update_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.entries(id) ON DELETE CASCADE,
  source_table text NOT NULL,      -- 'entries' | 'family_cards' | 'questionnaire_responses'
  changed jsonb NOT NULL,          -- {"kolom": {"old": ..., "new": ...}}
  context jsonb,                   -- konteks tampilan: nomor KK, nama kepala keluarga, soal, dst.
  changed_by uuid,                 -- auth.uid() pembuat perubahan (null = sistem/layanan)
  changed_by_name text,            -- snapshot nama saat perubahan terjadi (disimpan agar tetap terbaca)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entry_update_logs_entry_id_idx
  ON public.entry_update_logs (entry_id, created_at DESC);

ALTER TABLE public.entry_update_logs ENABLE ROW LEVEL SECURITY;

-- Pembacaan mengikuti hak yang sama dengan tabel entries-nya:
-- super_admin/admin (module entry) bebas, kader hanya entry miliknya.
DROP POLICY IF EXISTS entry_update_logs_select ON public.entry_update_logs;
CREATE POLICY entry_update_logs_select ON public.entry_update_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.entries e
      WHERE e.id = entry_id
        AND (public.has_module_access(auth.uid(), 'entry') OR e.created_by = auth.uid())
    )
  );

GRANT SELECT ON public.entry_update_logs TO authenticated;
-- Tidak ada INSERT/UPDATE/DELETE untuk klien: satu-satunya penulis adalah trigger.

CREATE OR REPLACE FUNCTION public.log_entry_row_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  diff jsonb := '{}'::jsonb;
  col text;
  target_entry uuid;
  ctx jsonb := NULL;
  actor_name text;
BEGIN
  -- Bandingkan kolom per kolom; kolom penanda waktu tidak dianggap perubahan.
  FOR col IN SELECT * FROM jsonb_object_keys(old_json) LOOP
    CONTINUE WHEN col IN ('created_at', 'updated_at');
    IF old_json -> col IS DISTINCT FROM new_json -> col THEN
      diff := diff || jsonb_build_object(
        col, jsonb_build_object('old', old_json -> col, 'new', new_json -> col)
      );
    END IF;
  END LOOP;
  -- Perubahan tanpa isi (mis. UPDATE dengan nilai sama) tidak dicatat.
  IF diff = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'entries' THEN
    target_entry := NEW.id;
  ELSIF TG_TABLE_NAME = 'family_cards' THEN
    target_entry := NEW.entry_id;
    ctx := jsonb_build_object(
      'kk_number', COALESCE(OLD.kk_number, NEW.kk_number),
      'kepala_keluarga', COALESCE(OLD.kepala_keluarga, NEW.kepala_keluarga)
    );
  ELSE -- questionnaire_responses
    SELECT fc.entry_id,
           jsonb_build_object(
             'kk_number', fc.kk_number,
             'kepala_keluarga', fc.kepala_keluarga,
             'pillar', NEW.pillar,
             'question_code', NEW.question_code
           )
      INTO target_entry, ctx
      FROM public.family_cards fc
     WHERE fc.id = NEW.family_card_id;
  END IF;

  -- Entry induk sudah tidak ada (mis. terhapus berbarengan) — lewati.
  IF target_entry IS NULL THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    SELECT p.full_name INTO actor_name FROM public.profiles p WHERE p.id = auth.uid();
  END IF;

  INSERT INTO public.entry_update_logs (entry_id, source_table, changed, context, changed_by, changed_by_name)
  VALUES (target_entry, TG_TABLE_NAME, diff, ctx, auth.uid(), actor_name);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS entries_log_update ON public.entries;
CREATE TRIGGER entries_log_update
  AFTER UPDATE ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.log_entry_row_update();

DROP TRIGGER IF EXISTS family_cards_log_update ON public.family_cards;
CREATE TRIGGER family_cards_log_update
  AFTER UPDATE ON public.family_cards
  FOR EACH ROW EXECUTE FUNCTION public.log_entry_row_update();

DROP TRIGGER IF EXISTS questionnaire_responses_log_update ON public.questionnaire_responses;
CREATE TRIGGER questionnaire_responses_log_update
  AFTER UPDATE ON public.questionnaire_responses
  FOR EACH ROW EXECUTE FUNCTION public.log_entry_row_update();
