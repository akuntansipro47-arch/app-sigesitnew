-- Rule baru untuk kader: 1 kelurahan + 1 RW, tetapi boleh lebih dari satu RT
-- (kader bisa input data beda RT dalam 1 RW & 1 kelurahan yang sama).
-- Kolom rt_id lama tetap dipakai sebagai "RT pertama" agar kompatibel dengan
-- kode/layanan lama; daftar lengkap disimpan di rt_ids.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rt_ids text[];

-- Isi awal dari rt_id lama supaya pengguna yang sudah ada langsung punya daftar RT.
UPDATE public.profiles
SET rt_ids = ARRAY[rt_id::text]
WHERE rt_ids IS NULL AND rt_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.rt_ids IS
  'Daftar id RT (boleh lebih dari satu) dalam satu RW & kelurahan yang sama — akses kader.';
