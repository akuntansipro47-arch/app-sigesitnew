ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

ALTER TABLE public.profiles
  ALTER COLUMN module_access SET DEFAULT '{"entry": false, "wilayah": false, "pengguna": false, "lokasi": false, "uji_air": false, "uji_udara": false, "pangan": false, "group_tpp": false}'::jsonb;

UPDATE public.profiles
SET module_access = CASE role
  WHEN 'super_admin' THEN '{"entry": true, "wilayah": true, "pengguna": true, "lokasi": true, "uji_air": true, "uji_udara": true, "pangan": true, "group_tpp": true}'::jsonb
  WHEN 'admin' THEN jsonb_build_object(
    'entry', coalesce((module_access ->> 'entry')::boolean, false),
    'wilayah', coalesce((module_access ->> 'wilayah')::boolean, false),
    'pengguna', false,
    'lokasi', coalesce((module_access ->> 'lokasi')::boolean, false),
    'uji_air', coalesce((module_access ->> 'uji_air')::boolean, false),
    'uji_udara', coalesce((module_access ->> 'uji_udara')::boolean, false),
    'pangan', coalesce((module_access ->> 'pangan')::boolean, false),
    'group_tpp', coalesce((module_access ->> 'group_tpp')::boolean, false)
  )
  ELSE '{"entry": true, "wilayah": false, "pengguna": false, "lokasi": false, "uji_air": false, "uji_udara": false, "pangan": false, "group_tpp": false}'::jsonb
END;

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

UPDATE public.entries
SET created_by = officer_id
WHERE created_by IS NULL;

ALTER TABLE public.entries
  ALTER COLUMN created_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entries_created_by ON public.entries(created_by);

CREATE OR REPLACE FUNCTION public.set_entry_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin(auth.uid()) THEN
    NEW.created_by := auth.uid();
    NEW.officer_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entries_set_ownership ON public.entries;
CREATE TRIGGER entries_set_ownership
  BEFORE INSERT OR UPDATE ON public.entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_entry_ownership();

CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role = 'super_admin'
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND role IN ('super_admin', 'admin')
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_module_access(uid uuid, module_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = uid
      AND is_active = true
      AND (
        role = 'super_admin'
        OR (
          role = 'admin'
          AND coalesce((module_access ->> module_name)::boolean, false)
        )
      );
$$;

CREATE OR REPLACE FUNCTION public.can_access_entry(uid uuid, entry_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entries
    WHERE id = entry_uid
      AND (
        public.has_module_access(uid, 'entry')
        OR created_by = uid
      );
$$;

DROP POLICY IF EXISTS "users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "super admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "super admins update profiles" ON public.profiles;
DROP POLICY IF EXISTS "super admins delete profiles" ON public.profiles;

CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND is_active = true);

CREATE POLICY "super admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "super admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "authenticated users read master data" ON public.kelurahan;
DROP POLICY IF EXISTS "authenticated users read rw" ON public.rw;
DROP POLICY IF EXISTS "authenticated users read rt" ON public.rt;
DROP POLICY IF EXISTS "authenticated users manage kelurahan" ON public.kelurahan;
DROP POLICY IF EXISTS "authenticated users manage rw" ON public.rw;
DROP POLICY IF EXISTS "authenticated users manage rt" ON public.rt;
DROP POLICY IF EXISTS "anonymous users read kelurahan" ON public.kelurahan;
DROP POLICY IF EXISTS "anonymous users create kelurahan" ON public.kelurahan;
DROP POLICY IF EXISTS "anonymous users update kelurahan" ON public.kelurahan;
DROP POLICY IF EXISTS "anonymous users delete kelurahan" ON public.kelurahan;
DROP POLICY IF EXISTS "anonymous users read rw" ON public.rw;
DROP POLICY IF EXISTS "anonymous users create rw" ON public.rw;
DROP POLICY IF EXISTS "anonymous users update rw" ON public.rw;
DROP POLICY IF EXISTS "anonymous users delete rw" ON public.rw;
DROP POLICY IF EXISTS "anonymous users read rt" ON public.rt;
DROP POLICY IF EXISTS "anonymous users create rt" ON public.rt;
DROP POLICY IF EXISTS "anonymous users update rt" ON public.rt;
DROP POLICY IF EXISTS "anonymous users delete rt" ON public.rt;

CREATE POLICY "authenticated users read regions" ON public.kelurahan
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "authenticated users read rw" ON public.rw
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "authenticated users read rt" ON public.rt
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authorized users manage kelurahan" ON public.kelurahan
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'wilayah'))
  WITH CHECK (public.has_module_access(auth.uid(), 'wilayah'));
CREATE POLICY "authorized users manage rw" ON public.rw
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'wilayah'))
  WITH CHECK (public.has_module_access(auth.uid(), 'wilayah'));
CREATE POLICY "authorized users manage rt" ON public.rt
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'wilayah'))
  WITH CHECK (public.has_module_access(auth.uid(), 'wilayah'));

DROP POLICY IF EXISTS "officers manage own entries" ON public.entries;
DROP POLICY IF EXISTS "super admins manage all entries" ON public.entries;

CREATE POLICY "authorized users read entries" ON public.entries
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'entry') OR created_by = auth.uid());

CREATE POLICY "authorized users insert entries" ON public.entries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_module_access(auth.uid(), 'entry')
    OR (created_by = auth.uid() AND officer_id = auth.uid())
  );

CREATE POLICY "authorized users update entries" ON public.entries
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'entry') OR created_by = auth.uid())
  WITH CHECK (
    public.has_module_access(auth.uid(), 'entry')
    OR (created_by = auth.uid() AND officer_id = auth.uid())
  );

CREATE POLICY "authorized users delete entries" ON public.entries
  FOR DELETE TO authenticated
  USING (public.has_module_access(auth.uid(), 'entry') OR created_by = auth.uid());

DROP POLICY IF EXISTS "officers manage own family cards" ON public.family_cards;
DROP POLICY IF EXISTS "super admins manage all family cards" ON public.family_cards;

CREATE POLICY "authorized users read family cards" ON public.family_cards
  FOR SELECT TO authenticated
  USING (public.can_access_entry(auth.uid(), entry_id));

CREATE POLICY "authorized users insert family cards" ON public.family_cards
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_entry(auth.uid(), entry_id));

CREATE POLICY "authorized users update family cards" ON public.family_cards
  FOR UPDATE TO authenticated
  USING (public.can_access_entry(auth.uid(), entry_id))
  WITH CHECK (public.can_access_entry(auth.uid(), entry_id));

CREATE POLICY "authorized users delete family cards" ON public.family_cards
  FOR DELETE TO authenticated
  USING (public.can_access_entry(auth.uid(), entry_id));

DROP POLICY IF EXISTS "officers manage own questionnaire responses" ON public.questionnaire_responses;
DROP POLICY IF EXISTS "super admins manage all questionnaire responses" ON public.questionnaire_responses;

CREATE POLICY "authorized users read questionnaire responses" ON public.questionnaire_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_cards
      WHERE id = questionnaire_responses.family_card_id
        AND public.can_access_entry(auth.uid(), entry_id)
    )
  );

CREATE POLICY "authorized users insert questionnaire responses" ON public.questionnaire_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.family_cards
      WHERE id = questionnaire_responses.family_card_id
        AND public.can_access_entry(auth.uid(), entry_id)
    )
  );

CREATE POLICY "authorized users update questionnaire responses" ON public.questionnaire_responses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_cards
      WHERE id = questionnaire_responses.family_card_id
        AND public.can_access_entry(auth.uid(), entry_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.family_cards
      WHERE id = questionnaire_responses.family_card_id
        AND public.can_access_entry(auth.uid(), entry_id)
    )
  );

CREATE POLICY "authorized users delete questionnaire responses" ON public.questionnaire_responses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.family_cards
      WHERE id = questionnaire_responses.family_card_id
        AND public.can_access_entry(auth.uid(), entry_id)
    )
  );

CREATE OR REPLACE FUNCTION public.get_next_entry_number(officer_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT coalesce(max(entry_number), 0) + 1
  INTO next_num
  FROM public.entries
  WHERE created_by = get_next_entry_number.officer_id
    AND date_trunc('year', entry_date) = date_trunc('year', current_date);
  RETURN next_num;
END;
$$;

DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Locations can be created by authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Locations can be updated by authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Locations can be deleted by authenticated users" ON public.locations;

CREATE POLICY "authorized users read locations" ON public.locations
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'lokasi'));

CREATE POLICY "authorized users insert locations" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'lokasi'));

CREATE POLICY "authorized users update locations" ON public.locations
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'lokasi'))
  WITH CHECK (public.has_module_access(auth.uid(), 'lokasi'));

CREATE POLICY "authorized users delete locations" ON public.locations
  FOR DELETE TO authenticated
  USING (public.has_module_access(auth.uid(), 'lokasi'));

DROP POLICY IF EXISTS "Water quality tests are viewable by authenticated users" ON public.water_quality_tests;
DROP POLICY IF EXISTS "Water quality tests can be created by authenticated users" ON public.water_quality_tests;
DROP POLICY IF EXISTS "Water quality tests can be updated by authenticated users" ON public.water_quality_tests;
DROP POLICY IF EXISTS "Water quality tests can be deleted by authenticated users" ON public.water_quality_tests;

CREATE POLICY "authorized users read water quality tests" ON public.water_quality_tests
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'uji_air'));

CREATE POLICY "authorized users insert water quality tests" ON public.water_quality_tests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'uji_air'));

CREATE POLICY "authorized users update water quality tests" ON public.water_quality_tests
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'uji_air'));
  WITH CHECK (public.has_module_access(auth.uid(), 'uji_air'));

CREATE POLICY "authorized users delete water quality tests" ON public.water_quality_tests
  FOR DELETE TO authenticated
  USING (public.has_module_access(auth.uid(), 'uji_air'));

DROP POLICY IF EXISTS "Air quality tests are viewable by authenticated users" ON public.air_quality_tests;
DROP POLICY IF EXISTS "Air quality tests can be created by authenticated users" ON public.air_quality_tests;
DROP POLICY IF EXISTS "Air quality tests can be updated by authenticated users" ON public.air_quality_tests;
DROP POLICY IF EXISTS "Air quality tests can be deleted by authenticated users" ON public.air_quality_tests;

CREATE POLICY "authorized users read air quality tests" ON public.air_quality_tests
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'uji_udara'));

CREATE POLICY "authorized users insert air quality tests" ON public.air_quality_tests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'uji_udara'));

CREATE POLICY "authorized users update air quality tests" ON public.air_quality_tests
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'uji_udara'));
  WITH CHECK (public.has_module_access(auth.uid(), 'uji_udara'));

CREATE POLICY "authorized users delete air quality tests" ON public.air_quality_tests
  FOR DELETE TO authenticated
  USING (public.has_module_access(auth.uid(), 'uji_udara'));

DROP POLICY IF EXISTS "Authenticated users can read group_tpp" ON public.group_tpp;
DROP POLICY IF EXISTS "Authenticated users can insert group_tpp" ON public.group_tpp;
DROP POLICY IF EXISTS "Authenticated users can update group_tpp" ON public.group_tpp;
DROP POLICY IF EXISTS "Authenticated users can delete group_tpp" ON public.group_tpp;

CREATE POLICY "authorized users read group tpp" ON public.group_tpp
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'group_tpp'));

CREATE POLICY "authorized users insert group tpp" ON public.group_tpp
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'group_tpp'));

CREATE POLICY "authorized users update group tpp" ON public.group_tpp
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'group_tpp'))
  WITH CHECK (public.has_module_access(auth.uid(), 'group_tpp'));

CREATE POLICY "authorized users delete group tpp" ON public.group_tpp
  FOR DELETE TO authenticated
  USING (public.has_module_access(auth.uid(), 'group_tpp'));

DROP POLICY IF EXISTS "Authenticated users can read food_inspection_results" ON public.food_inspection_results;
DROP POLICY IF EXISTS "Authenticated users can insert food_inspection_results" ON public.food_inspection_results;
DROP POLICY IF EXISTS "Authenticated users can update food_inspection_results" ON public.food_inspection_results;
DROP POLICY IF EXISTS "Authenticated users can delete food_inspection_results" ON public.food_inspection_results;

CREATE POLICY "authorized users read food inspections" ON public.food_inspection_results
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'pangan'));

CREATE POLICY "authorized users insert food inspections" ON public.food_inspection_results
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'pangan'));

CREATE POLICY "authorized users update food inspections" ON public.food_inspection_results
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'pangan'));
  WITH CHECK (public.has_module_access(auth.uid(), 'pangan'));

CREATE POLICY "authorized users delete food inspections" ON public.food_inspection_results
  FOR DELETE TO authenticated
  USING (public.has_module_access(auth.uid(), 'pangan'));

DROP POLICY IF EXISTS "PKM info is viewable by authenticated users" ON public.pkm_info;
DROP POLICY IF EXISTS "PKM info can be updated by authenticated users" ON public.pkm_info;
DROP POLICY IF EXISTS "PKM info can be created by authenticated users" ON public.pkm_info;

CREATE POLICY "authenticated users read PKM info" ON public.pkm_info
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "super admins insert PKM info" ON public.pkm_info
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "super admins update PKM info" ON public.pkm_info
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
