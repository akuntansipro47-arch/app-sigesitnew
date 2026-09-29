-- Memungkinkan pemegang modul pemeriksaan membaca data master yang dibutuhkannya:
-- - locations: dibutuhkan oleh form Uji Air & Uji Udara (dropdown lokasi).
--   Sebelumnya hanya pemegang 'lokasi' yang bisa SELECT, sehingga admin dengan
--   akses uji_air/uji_udara saja mendapat dropdown kosong dan gagal simpan
--   ("Lokasi harus dipilih").
-- - group_tpp: dibutuhkan oleh form Hasil Pangan (dropdown Jenis TPP).
--   Sebelumnya hanya pemegang 'group_tpp' yang bisa SELECT, sehingga admin
--   dengan akses pangan saja mendapat daftar kosong.
-- Tulis (insert/update/delete) tetap restricted ke modul masing-masing.

DROP POLICY IF EXISTS "authorized users read locations" ON public.locations;
CREATE POLICY "authorized users read locations" ON public.locations
  FOR SELECT TO authenticated
  USING (
    public.has_module_access(auth.uid(), 'lokasi')
    OR public.has_module_access(auth.uid(), 'uji_air')
    OR public.has_module_access(auth.uid(), 'uji_udara')
  );

DROP POLICY IF EXISTS "authorized users read group tpp" ON public.group_tpp;
CREATE POLICY "authorized users read group tpp" ON public.group_tpp
  FOR SELECT TO authenticated
  USING (
    public.has_module_access(auth.uid(), 'group_tpp')
    OR public.has_module_access(auth.uid(), 'pangan')
  );
