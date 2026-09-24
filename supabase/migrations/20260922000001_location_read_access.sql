-- Lokasi adalah data referensi yang ikut ditampilkan oleh modul lain
-- (entry, uji_air, uji_udara, pangan, group_tpp). Akses baca tidak boleh
-- terkunci hanya pada modul 'lokasi', karena baris uji akan menampilkan
-- "Lokasi tidak ditemukan" bagi admin tanpa akses modul lokasi.
CREATE OR REPLACE FUNCTION public.has_location_read_access(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.has_module_access(uid, 'lokasi')
      OR public.has_module_access(uid, 'entry')
      OR public.has_module_access(uid, 'uji_air')
      OR public.has_module_access(uid, 'uji_udara')
      OR public.has_module_access(uid, 'pangan')
      OR public.has_module_access(uid, 'group_tpp')
$$;

DROP POLICY IF EXISTS "authorized users read locations" ON public.locations;
CREATE POLICY "authorized users read locations" ON public.locations
  FOR SELECT TO authenticated
  USING (public.has_location_read_access(auth.uid()));
