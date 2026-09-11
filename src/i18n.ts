export type Language = 'id' | 'en' | 'su'

export type TranslationKeys = {
  app: { title: string; subtitle: string }
  dashboard: { greeting: string; summary: string; inputData: string }
  menu: { main: string; examination: string; masterData: string; account: string }
  nav: { home: string; entry: string; ujiAir: string; ujiUdara: string; wilayah: string; lokasi: string; pengguna: string; profile: string; profileUser: string; settings: string; groupTpp: string; pangan: string }
  entry: { title: string; description: string; addEntry: string; noData: string; noKk: string; addKk: string }
  wilayah: { title: string; description: string; add: string; exportExcel: string }
  pengguna: { title: string; description: string; add: string }
  lokasi: { title: string; description: string; add: string; exportExcel: string; filter: string; search: string; showing: string }
  ujiAir: { title: string; description: string; add: string; exportExcel: string; noData: string; filter: string; filterKelurahan: string; filterLocation: string; resetFilter: string }
  ujiUdara: { title: string; description: string; add: string; exportExcel: string; noData: string; filter: string; filterKelurahan: string; filterLocation: string; resetFilter: string }
   groupTpp: { title: string; description: string; add: string; exportExcel: string; noData: string; filter: string; search: string; showing: string }
   pangan: { title: string; description: string; add: string; exportExcel: string; noData: string; filter: string; search: string; showing: string }
  profile: { title: string; description: string; save: string; back: string; success: string }
  settings: { title: string; description: string; theme: string; fontFamily: string; language: string; save: string }
  actions: { edit: string; delete: string; save: string; cancel: string; confirm: string; logout: string }
  status: { synced: string; lastUpdate: string; allSynced: string }
  auth: { login: string; email: string; password: string; submit: string; loading: string; error: string; changePassword: string; currentPassword: string; newPassword: string; confirmPassword: string; tempPasswordWarning: string }
  common: { loading: string; empty: string; noData: string; submit: string; cancel: string; required: string; optional: string }
}

export const translations: Record<Language, TranslationKeys> = {
  id: {
    app: { title: 'SIGESIT', subtitle: 'PKM Padasuka' },
    dashboard: { greeting: 'Selamat pagi, Syifa.', summary: 'Berikut ringkasan pendataan wilayah kerja {name} hari ini.', inputData: '+ Input data rumah' },
    menu: { main: 'MENU UTAMA', examination: 'PEMERIKSAAN', masterData: 'DATA MASTER', account: 'AKUN' },
    nav: { home: 'Beranda', entry: 'Entry Data', ujiAir: 'Uji Air', ujiUdara: 'Uji Udara', wilayah: 'Wilayah', lokasi: 'Lokasi', pengguna: 'Pengguna', profile: 'Profil PKM', profileUser: 'Profil Saya', settings: 'Pengaturan', groupTpp: 'Group/Jenis TPP', pangan: 'Hasil Pangan/Makanan' },
    entry: { title: 'Data Rumah & Keluarga', description: 'Kelola data entry kader/relawan dengan auto-filter wilayah.', addEntry: '+ Tambah Entry', noData: 'Belum ada data entry', noKk: 'Belum ada kartu keluarga', addKk: '+ Tambah KK' },
    wilayah: { title: 'Data Wilayah', description: 'Kelola Kelurahan, RW, dan RT dengan hubungan wilayah yang terjaga.', add: '+ Tambah {level}', exportExcel: 'Export Excel' },
    pengguna: { title: 'Pengguna Kader & Relawan', description: 'Kelola akun kader, relawan, dan admin yang dapat mengakses SIGESIT.', add: '+ Tambah pengguna' },
    lokasi: { title: 'Data Lokasi', description: 'Kelola lokasi untuk pemeriksaan air dan udara.', add: '+ Tambah Lokasi', exportExcel: 'Export Excel', filter: 'Filter', search: 'Pencarian', showing: 'Menampilkan {show} dari {total} lokasi' },
    ujiAir: { title: 'Hasil Uji Pemeriksaan Air', description: 'Kelola hasil uji kualitas air dari berbagai lokasi.', add: '+ Tambah Uji Air', exportExcel: 'Export Excel', noData: 'Belum ada data uji air', filter: 'Filter Lokasi', filterKelurahan: 'Filter Kelurahan', filterLocation: 'Filter Lokasi', resetFilter: 'Reset Filter' },
    ujiUdara: { title: 'Hasil Uji Kualitas Udara', description: 'Kelola hasil uji kualitas udara dari berbagai lokasi.', add: '+ Tambah Uji Udara', exportExcel: 'Export Excel', noData: 'Belum ada data uji udara', filter: 'Filter Lokasi', filterKelurahan: 'Filter Kelurahan', filterLocation: 'Filter Lokasi', resetFilter: 'Reset Filter' },
    groupTpp: { title: 'Group / Jenis TPP', description: 'Kelola data group atau jenis TPP.', add: '+ Tambah Group/Jenis', exportExcel: 'Export Excel', noData: 'Belum ada data Group/Jenis TPP', filter: 'Pencarian', search: 'Cari nama group/jenis...', showing: 'Menampilkan {show} dari {total} data' },
    pangan: { title: 'Hasil Pemeriksaan Pangan/Makanan', description: 'Kelola hasil pemeriksaan pangan/makanan (Boraks, Formalin, Rodamin B, Metanil Yellow).', add: '+ Tambah Hasil', exportExcel: 'Export Excel', noData: 'Belum ada data hasil pemeriksaan', filter: 'Filter', search: 'Cari data...', showing: 'Menampilkan {show} dari {total} data' },
    profile: { title: 'Informasi PKM', description: 'Kelola informasi PKM dan logo untuk tampilan aplikasi dan laporan.', save: 'Simpan Perubahan', back: 'Kembali', success: 'Profil PKM berhasil diperbarui!' },
    settings: { title: 'Pengaturan', description: 'Ubah tampilan, bahasa, dan preferensi aplikasi.', theme: 'Tema', fontFamily: 'Jenis Huruf', language: 'Bahasa', save: 'Simpan Pengaturan' },
    actions: { edit: 'Edit', delete: 'Hapus', save: 'Simpan', cancel: 'Batal', confirm: 'Ya', logout: 'Keluar' },
    status: { synced: 'Tersinkron', lastUpdate: 'Data Terakhir: {time} WIB', allSynced: 'Semua data tersinkronisasi' },
    auth: { login: 'Masuk', email: 'Email', password: 'Kata sandi', submit: 'Masuk', loading: 'Memuat sesi…', error: 'Email atau kata sandi salah.', changePassword: 'Ubah Kata Sandi', currentPassword: 'Kata sandi saat ini', newPassword: 'Kata sandi baru', confirmPassword: 'Konfirmasi kata sandi baru', tempPasswordWarning: 'Anda harus mengubah kata sandi sementara sebelum melanjutkan.' },
    common: { loading: 'Memuat…', empty: 'Belum ada data', noData: 'Tidak ada data', submit: 'Kirim', cancel: 'Batal', required: 'Wajib diisi', optional: 'Opsional' },
  },
  en: {
    app: { title: 'SIGESIT', subtitle: 'PKM Padasuka' },
    dashboard: { greeting: 'Good morning, Syifa.', summary: 'Here is the field data summary for {name} today.', inputData: '+ Input house data' },
    menu: { main: 'MAIN MENU', examination: 'EXAMINATION', masterData: 'MASTER DATA', account: 'ACCOUNT' },
    nav: { home: 'Home', entry: 'Entry Data', ujiAir: 'Water Test', ujiUdara: 'Air Test', wilayah: 'Region', lokasi: 'Location', pengguna: 'Users', profile: 'PKM Profile', profileUser: 'My Profile', settings: 'Settings', groupTpp: 'Group/Type TPP', pangan: 'Food Inspection' },
    entry: { title: 'Household & Family Data', description: 'Manage field officer entry data with auto-region filter.', addEntry: '+ Add Entry', noData: 'No entry data yet', noKk: 'No family cards yet', addKk: '+ Add KK' },
    wilayah: { title: 'Regional Data', description: 'Manage Kelurahan, RW, and RT with maintained regional relationships.', add: '+ Add {level}', exportExcel: 'Export Excel' },
    pengguna: { title: 'Field Officers', description: 'Manage field officer, admin, and staff accounts accessing SIGESIT.', add: '+ Add user' },
    lokasi: { title: 'Location Data', description: 'Manage locations for air and air quality inspections.', add: '+ Add Location', exportExcel: 'Export Excel', filter: 'Filter', search: 'Search', showing: 'Showing {show} of {total} locations' },
    ujiAir: { title: 'Water Quality Test Results', description: 'Manage water quality test results from various locations.', add: '+ Add Water Test', exportExcel: 'Export Excel', noData: 'No water test data yet', filter: 'Location Filter', filterKelurahan: 'Filter Kelurahan', filterLocation: 'Filter Location', resetFilter: 'Reset Filter' },
    ujiUdara: { title: 'Air Quality Test Results', description: 'Manage air quality test results from various locations.', add: '+ Add Air Test', exportExcel: 'Export Excel', noData: 'No air test data yet', filter: 'Location Filter', filterKelurahan: 'Filter Kelurahan', filterLocation: 'Filter Location', resetFilter: 'Reset Filter' },
    groupTpp: { title: 'Group / Type TPP', description: 'Manage group or type TPP data.', add: '+ Add Group/Type', exportExcel: 'Export Excel', noData: 'No Group/Type TPP data yet', filter: 'Search', search: 'Search group/type name...', showing: 'Showing {show} of {total} data' },
    pangan: { title: 'Food Inspection Results', description: 'Manage food inspection results (Borax, Formalin, Rhodamine B, Metanil Yellow).', add: '+ Add Result', exportExcel: 'Export Excel', noData: 'No food inspection data yet', filter: 'Filter', search: 'Search data...', showing: 'Showing {show} of {total} data' },
    profile: { title: 'PKM Information', description: 'Manage PKM information and logo for app display and reports.', save: 'Save Changes', back: 'Back', success: 'PKM profile updated successfully!' },
    settings: { title: 'Settings', description: 'Change appearance, language, and app preferences.', theme: 'Theme', fontFamily: 'Font Family', language: 'Language', save: 'Save Settings' },
    actions: { edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', confirm: 'Yes', logout: 'Logout' },
    status: { synced: 'Synced', lastUpdate: 'Last Update: {time} WIB', allSynced: 'All data synchronized' },
    auth: { login: 'Login', email: 'Email', password: 'Password', submit: 'Login', loading: 'Loading session…', error: 'Invalid email or password.', changePassword: 'Change Password', currentPassword: 'Current password', newPassword: 'New password', confirmPassword: 'Confirm new password', tempPasswordWarning: 'You must change your temporary password before continuing.' },
    common: { loading: 'Loading…', empty: 'No data', noData: 'No data', submit: 'Submit', cancel: 'Cancel', required: 'Required', optional: 'Optional' },
  },
  su: {
    app: { title: 'SIGESIT', subtitle: 'PKM Padasuka' },
    dashboard: { greeting: 'Wilujeng enjing, Syifa.', summary: 'Ieu ringkasan data wilayah {name} poé ieu.', inputData: '+ Input data imah' },
    menu: { main: 'MENU UTAMA', examination: 'PARIKSA', masterData: 'DATA MASTER', account: 'AKUN' },
    nav: { home: 'Kaca Utama', entry: 'Entry Data', ujiAir: 'Uji Cai', ujiUdara: 'Uji Hawa', wilayah: 'Wilayah', lokasi: 'Lokasi', pengguna: 'Pangguna', profile: 'Profil PKM', profileUser: 'Profil Abdi', settings: 'Pangaturan', groupTpp: 'Group/Jenis TPP', pangan: 'Hasil Pangan/Makanan' },
    entry: { title: 'Data Imah & Kulawarga', description: 'Katur data entry kader/relawan kanan filter wilayah otomatis.', addEntry: '+ Tambah Entry', noData: 'Belum aya data entry', noKk: 'Belum aya kartu kulawarga', addKk: '+ Tambah KK' },
    wilayah: { title: 'Data Wilayah', description: 'Katur Kelurahan, RW, jeung RT kalayan hubungan wilayah nu dijaga.', add: '+ Tambah {level}', exportExcel: 'Ekspor Excel' },
    pengguna: { title: 'Pangguna Kader & Relawan', description: 'Katur akun kader, relawan, jeung admin nu bisa ngakses SIGESIT.', add: '+ Tambah pangguna' },
    lokasi: { title: 'Data Lokasi', description: 'Katur lokasi pikeun pemeriksa cai jeung hawa.', add: '+ Tambah Lokasi', exportExcel: 'Ekspor Excel', filter: 'Filter', search: 'Milarian', showing: 'Nampilake {show} ti {total} lokasi' },
    ujiAir: { title: 'Hasil Uji Pemeriksaan Cai', description: 'Katur hasil uji kualitas cai tina loba lokasi.', add: '+ Tambah Uji Cai', exportExcel: 'Ekspor Excel', noData: 'Belum aya data uji cai', filter: 'Filter Lokasi', filterKelurahan: 'Filter Kelurahan', filterLocation: 'Filter Lokasi', resetFilter: 'Reset Filter' },
    ujiUdara: { title: 'Hasil Uji Kualitas Hawa', description: 'Katur hasil uji kualitas hawa tina loba lokasi.', add: '+ Tambah Uji Hawa', exportExcel: 'Ekspor Excel', noData: 'Belum aya data uji hawa', filter: 'Filter Lokasi', filterKelurahan: 'Filter Kelurahan', filterLocation: 'Filter Lokasi', resetFilter: 'Reset Filter' },
    groupTpp: { title: 'Group / Jenis TPP', description: 'Katur data group atawa jenis TPP.', add: '+ Tambah Group/Jenis', exportExcel: 'Ekspor Excel', noData: 'Belum aya data Group/Jenis TPP', filter: 'Pencarian', search: 'Milarian ngaran group/jenis...', showing: 'Nampilake {show} ti {total} data' },
    pangan: { title: 'Hasil Pemeriksaan Pangan/Makanan', description: 'Katur hasil pemeriksa pangan/makanan (Boraks, Formalin, Rodamin B, Metanil Yellow).', add: '+ Tambah Hasil', exportExcel: 'Ekspor Excel', noData: 'Belum aya data hasil pemeriksaan', filter: 'Filter', search: 'Milarian data...', showing: 'Nampilake {show} ti {total} data' },
    profile: { title: 'Informasi PKM', description: 'Katur informasi PKM jeung logo pikeun tampilan aplikasi jeung laporan.', save: 'Simpan Parobihan', back: 'Kembali', success: 'Profil PKM sukses diupdate!' },
    settings: { title: 'Pangaturan', description: 'Ubah tampilan, bahasa, jeung preferensi aplikasi.', theme: 'Tema', fontFamily: 'Jenis Huruf', language: 'Bahasa', save: 'Simpan Pangaturan' },
    actions: { edit: 'Edit', delete: 'Hapus', save: 'Simpan', cancel: 'Batal', confirm: 'Laha', logout: 'Kaluar' },
    status: { synced: 'Tersinkron', lastUpdate: 'Data Terahir: {time} WIB', allSynced: 'Sadaya data tersinkronisasi' },
    auth: { login: 'Masuk', email: 'Email', password: 'Kata sandi', submit: 'Masuk', loading: 'Memuat sesi…', error: 'Email atanapi kata sandi salah.', changePassword: 'Ubah Kata Sandi', currentPassword: 'Kata sandi ayeuna', newPassword: 'Kata sandi anyar', confirmPassword: 'Konfirmasi kata sandi anyar', tempPasswordWarning: 'Anjeun kudu ngubah kata sandi samentruna sateuacan neruskan.' },
    common: { loading: 'Memuat…', empty: 'Belum aya data', noData: 'Tidak aya data', submit: 'Kirim', cancel: 'Batal', required: 'Wajib diisi', optional: 'Opsional' },
  },
}
