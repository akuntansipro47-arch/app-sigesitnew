-- Fitur Restore Data (Pengaturan → Restore Data), khusus super_admin.
--
-- Tabel profiles sebelumnya TIDAK punya policy INSERT sama sekali, sehingga
-- super_admin tidak bisa menyisipkan baris profil lewat REST ketika restore
-- (profil adalah induk dari entries/family_cards/uji-* lewat foreign key).
-- Kebijakan ini hanya mengizinkan super_admin aktif menyisipkan baris profil;
-- baris milik akun yang sedang login tidak pernah dihapus oleh alur restore,
-- karena tanpa profil sendiri seluruh kebijakan RLS menolak sesi tersebut.
--
-- Sudah diterapkan langsung ke VPS produksi (2026-10-09).
CREATE POLICY profiles_insert_super_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));
