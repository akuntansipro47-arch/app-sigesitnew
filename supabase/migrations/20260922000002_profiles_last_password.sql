-- Simpan password terakhir yang ditetapkan super admin (saat buat pengguna,
-- edit password, atau generate ulang) agar terlihat di daftar modul Pengguna.
-- Terbaca hanya oleh pemilik profil dan super admin sesuai policy RLS profiles.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_password text;
