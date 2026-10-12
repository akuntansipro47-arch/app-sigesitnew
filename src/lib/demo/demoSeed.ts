import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER_ID, DEMO_USERNAME } from './demoStorage'

// ==================== DATA DUMMY MODE DEMO ====================
// Seluruh isi di bawah ini adalah data palsu (dummy) untuk keperluan demo.
// TIDAK ada satu pun data asli pengguna di sini, dan perubahan yang dibuat
// akun demo hanya tersimpan di perangkat (localStorage).

export type DemoAuthUser = {
  id: string
  username: string
  email: string
  password: string
  created_at: string
}

type Row = Record<string, unknown>

const NOW = new Date()

function daysAgo(days: number): string {
  const d = new Date(NOW.getTime() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

function stamp(days: number): string {
  const d = new Date(NOW.getTime() - days * 86_400_000)
  return d.toISOString()
}

// Daftar pertanyaan disederhanakan dari kuesioner asli (lihat questionnaireData
// di App.tsx) — hanya sebagian kode supaya data dummy tetap ringan.
const QUESTIONNAIRE_DEFS: Array<{ pillar: string; codes: string[] }> = [
  { pillar: 'fasilitas_jamban', codes: ['bab_di_jamban', 'jamban_milik_sendiri', 'kloset_leher_angsa'] },
  { pillar: 'jamban', codes: ['septik_sedot_3_5_tahun'] },
  { pillar: 'ctps', codes: ['sarana_ctps', 'air_mengalir', 'sabun', 'praktek_ctps', 'ctps_setelah_bab'] },
  { pillar: 'sumber_air', codes: ['perpipaan', 'sumur_bor_pompa', 'air_diolah', 'air_disimpan_tertutup'] },
  { pillar: 'sampah', codes: ['sampah_tidak_berserakan', 'tempat_sampah_tertutup', 'sampah_dipilah'] },
  { pillar: 'limbah', codes: ['tidak_genangan_limbah', 'saluran_limbah_kedap'] },
]

const KADER_ID = '22222222-2222-4222-8222-222222222222'
const ADMIN_ID = '33333333-3333-4333-8333-333333333333'

export function buildDemoSeed(): Record<string, Row[]> {
  const kelurahan: Row[] = [
    { id: 'kel-padasuka', code: '3273011001', name: 'Padasuka' },
    { id: 'kel-citeureup', code: '3273011002', name: 'Citeureup' },
    { id: 'kel-baros', code: '3273011003', name: 'Baros' },
  ]

  const rw: Row[] = [
    { id: 'rw-padasuka-01', kelurahan_id: 'kel-padasuka', number: '01' },
    { id: 'rw-padasuka-02', kelurahan_id: 'kel-padasuka', number: '02' },
    { id: 'rw-citeureup-01', kelurahan_id: 'kel-citeureup', number: '01' },
    { id: 'rw-citeureup-02', kelurahan_id: 'kel-citeureup', number: '02' },
    { id: 'rw-baros-01', kelurahan_id: 'kel-baros', number: '01' },
    { id: 'rw-baros-02', kelurahan_id: 'kel-baros', number: '02' },
  ]

  const rt: Row[] = [
    { id: 'rt-padasuka-01-01', rw_id: 'rw-padasuka-01', number: '01' },
    { id: 'rt-padasuka-01-02', rw_id: 'rw-padasuka-01', number: '02' },
    { id: 'rt-padasuka-02-01', rw_id: 'rw-padasuka-02', number: '01' },
    { id: 'rt-citeureup-01-01', rw_id: 'rw-citeureup-01', number: '01' },
    { id: 'rt-citeureup-02-01', rw_id: 'rw-citeureup-02', number: '01' },
    { id: 'rt-baros-01-01', rw_id: 'rw-baros-01', number: '01' },
    { id: 'rt-baros-02-01', rw_id: 'rw-baros-02', number: '01' },
  ]

  const groupTpp: Row[] = [
    { id: 'tpp-1', name: 'Warung Makan Sederhana', created_at: stamp(60), updated_at: stamp(60) },
    { id: 'tpp-2', name: 'Rumah Makan', created_at: stamp(58), updated_at: stamp(58) },
    { id: 'tpp-3', name: 'Pedagang Kaki Lima', created_at: stamp(55), updated_at: stamp(55) },
    { id: 'tpp-4', name: 'Kantin Sekolah', created_at: stamp(50), updated_at: stamp(50) },
  ]

  const profiles: Row[] = [
    {
      id: DEMO_USER_ID,
      full_name: 'User Demo',
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      nik: '3273010000000001',
      phone: '081200000001',
      role: 'super_admin',
      kelurahan_id: null,
      rw_id: null,
      rt_id: null,
      rt_ids: null,
      is_active: true,
      module_access: {
        entry: true, wilayah: true, pengguna: true, lokasi: true,
        uji_air: true, uji_udara: true, pangan: true, group_tpp: true,
      },
      is_temp_password: false,
      created_at: stamp(90),
    },
    {
      id: KADER_ID,
      full_name: 'Budi Santoso (Dummy)',
      username: 'budi.dummy',
      email: 'budi@sigesit.local',
      nik: '3273010000000002',
      phone: '081200000002',
      role: 'kader',
      kelurahan_id: 'kel-padasuka',
      rw_id: 'rw-padasuka-01',
      rt_id: 'rt-padasuka-01-01',
      rt_ids: ['rt-padasuka-01-01'],
      is_active: true,
      module_access: {
        entry: true, wilayah: false, pengguna: false, lokasi: false,
        uji_air: false, uji_udara: false, pangan: false, group_tpp: false,
      },
      is_temp_password: false,
      created_at: stamp(80),
    },
    {
      id: ADMIN_ID,
      full_name: 'Siti Aminah (Dummy)',
      username: 'siti.dummy',
      email: 'siti@sigesit.local',
      nik: '3273010000000003',
      phone: '081200000003',
      role: 'admin',
      kelurahan_id: null,
      rw_id: null,
      rt_id: null,
      rt_ids: null,
      is_active: true,
      module_access: {
        entry: true, wilayah: false, pengguna: false, lokasi: true,
        uji_air: true, uji_udara: true, pangan: true, group_tpp: false,
      },
      is_temp_password: false,
      created_at: stamp(75),
    },
  ]

  const locations: Row[] = [
    {
      id: 'loc-1', name: 'Sumur Bor RW 01 (Dummy)', code: 'LKC-001',
      address: 'Jl. Melati No. 12', kelurahan_id: 'kel-padasuka', rw_id: 'rw-padasuka-01', rt_id: 'rt-padasuka-01-01',
      latitude: -6.9175, longitude: 107.6191, description: 'Sumber air minum warga (dummy)',
      created_at: stamp(40), updated_at: stamp(40),
    },
    {
      id: 'loc-2', name: 'Posyandu Melati (Dummy)', code: 'LKC-002',
      address: 'Jl. Anggrek No. 3', kelurahan_id: 'kel-citeureup', rw_id: 'rw-citeureup-01', rt_id: 'rt-citeureup-01-01',
      latitude: -6.9201, longitude: 107.6144, description: 'Gedung Posyandu (dummy)',
      created_at: stamp(38), updated_at: stamp(38),
    },
    {
      id: 'loc-3', name: 'Kantin SDN 001 (Dummy)', code: 'LKC-003',
      address: 'Jl. Kenanga No. 8', kelurahan_id: 'kel-baros', rw_id: 'rw-baros-01', rt_id: 'rt-baros-01-01',
      latitude: -6.9143, longitude: 107.6098, description: 'Kantin sekolah (dummy)',
      created_at: stamp(35), updated_at: stamp(35),
    },
    {
      id: 'loc-4', name: 'Gudang PP (Dummy)', code: 'LKC-004',
      address: 'Jl. Dahlia No. 21', kelurahan_id: 'kel-padasuka', rw_id: 'rw-padasuka-02', rt_id: 'rt-padasuka-02-01',
      latitude: -6.9188, longitude: 107.6213, description: 'Tempat penampungan sementara (dummy)',
      created_at: stamp(30), updated_at: stamp(30),
    },
  ]

  const entries: Row[] = []
  const familyCards: Row[] = []
  const questionnaire: Row[] = []

  const heads = [
    'Ahmad Hidayat', 'Rina Marlina', 'Dedi Supriadi', 'Nia Kurniasih',
    'Agus Setiawan', 'Yuli Rahmawati', 'Tatang Suherman', 'Indah Permata',
    'Rudi Hartono', 'Lina Herlina',
  ]
  const streets = [
    'Jl. Melati No. 12', 'Jl. Anggrek No. 3', 'Jl. Kenanga No. 8',
    'Jl. Dahlia No. 21', 'Jl. Mawar No. 5', 'Jl. Flamboyan No. 9',
  ]

  let headIndex = 0
  for (let i = 0; i < 10; i++) {
    // 7 entry milik akun demo (super_admin) + 3 entry milik kader dummy.
    // Nomor entry dihitung per-petugas, persis seperti aturan database asli.
    const isDemoOfficer = i < 7
    const entryNumber = (isDemoOfficer ? i : i - 7) + 1
    const officerId = isDemoOfficer ? DEMO_USER_ID : KADER_ID
    const createdBy = officerId
    const entryId = `entry-${i + 1}`
    const rtRow = rt[i % rt.length]
    const rwRow = rw.find((item) => item.id === rtRow.rw_id) as Row

    entries.push({
      id: entryId,
      entry_number: entryNumber,
      entry_date: daysAgo(i),
      officer_id: officerId,
      created_by: createdBy,
      kelurahan_id: rwRow.kelurahan_id,
      rw_id: rwRow.id,
      rt_id: rtRow.id,
      created_at: stamp(i * 3 + 1),
      updated_at: stamp(i * 3 + 1),
    })

    const cardCount = i % 3 === 0 ? 2 : 1
    for (let c = 0; c < cardCount; c++) {
      const head = heads[headIndex % heads.length]
      headIndex++
      const cardId = `fc-${i + 1}-${c + 1}`
      familyCards.push({
        id: cardId,
        entry_id: entryId,
        kk_sequence: c + 1,
        kk_number: `327301${String(1000000000000 + headIndex * 137).slice(0, 13)}`,
        nik_kepala_keluarga: `327301${String(2000000000000 + headIndex * 91).slice(0, 13)}`,
        kepala_keluarga: head,
        address: streets[headIndex % streets.length],
        total_jiwa: 3 + (headIndex % 4),
        jiwa_menetap: 2 + (headIndex % 4),
        jamban_count: headIndex % 5 === 0 ? 0 : 1,
        created_at: stamp(i * 3 + 1),
        updated_at: stamp(i * 3 + 1),
      })

      QUESTIONNAIRE_DEFS.forEach((def, defIndex) => {
        def.codes.forEach((code, codeIndex) => {
          questionnaire.push({
            id: `qr-${cardId}-${defIndex}-${codeIndex}`,
            family_card_id: cardId,
            pillar: def.pillar,
            question_code: code,
            answer: (headIndex + codeIndex) % 3 !== 0,
            created_at: stamp(i * 3 + 1),
          })
        })
      })
    }
  }

  const waterQualityTests: Row[] = [
    {
      id: 'wqt-1', location_id: 'loc-1', test_date: daysAgo(9), officer_id: DEMO_USER_ID,
      water_temperature_value: 26, water_temperature_unit: 'C', air_temperature_value: 29, air_temperature_unit: 'C',
      tds_value: 320, turbidity_value: 4, color_value: 'Bening', odor_value: 'Tidak ada',
      ph_value: 7.1, nitrite_value: 0.02, nitrate_value: 0.9, chromium_value: 0.01, iron_value: 0.2,
      manganese_value: 0.05, chlorine_value: 0.3, fluoride_value: 0.1, aluminum_value: 0.05,
      e_coli_value: 0, coliform_value: 1, notes: 'Dummy — air layak konsumsi.',
    },
    {
      id: 'wqt-2', location_id: 'loc-2', test_date: daysAgo(14), officer_id: DEMO_USER_ID,
      water_temperature_value: 27, water_temperature_unit: 'C', air_temperature_value: 31, air_temperature_unit: 'C',
      tds_value: 410, turbidity_value: 7, color_value: 'Agak Keruh', odor_value: 'Lemah',
      ph_value: 6.8, nitrite_value: 0.05, nitrate_value: 1.4, chromium_value: 0.02, iron_value: 0.4,
      manganese_value: 0.08, chlorine_value: 0.2, fluoride_value: 0.1, aluminum_value: 0.1,
      e_coli_value: 1, coliform_value: 3, notes: 'Dummy — perlu penyuluhan.',
    },
    {
      id: 'wqt-3', location_id: 'loc-3', test_date: daysAgo(20), officer_id: KADER_ID,
      water_temperature_value: 25, water_temperature_unit: 'C', air_temperature_value: 30, air_temperature_unit: 'C',
      tds_value: 280, turbidity_value: 2, color_value: 'Bening', odor_value: 'Tidak ada',
      ph_value: 7.4, nitrite_value: 0.01, nitrate_value: 0.6, chromium_value: 0.01, iron_value: 0.1,
      manganese_value: 0.03, chlorine_value: 0.4, fluoride_value: 0.2, aluminum_value: 0.04,
      e_coli_value: 0, coliform_value: 0, notes: 'Dummy — air aman.',
    },
  ]

  const airQualityTests: Row[] = [
    {
      id: 'aqt-1', location_id: 'loc-1', test_date: daysAgo(8), officer_id: DEMO_USER_ID,
      temperature_1: 28, temperature_2: 29, temperature_3: 29, temperature_unit: 'C',
      humidity_1: 60, humidity_2: 62, humidity_3: 61,
      noise_1: 55, noise_2: 57, noise_3: 56,
      lighting_1: 320, lighting_2: 330, lighting_3: 325,
      pm25_1: 22, pm25_2: 24, pm25_3: 23,
      pm10_1: 40, pm10_2: 42, pm10_3: 41,
      ventilation_rate_1: 1.2, ventilation_rate_2: 1.3, ventilation_rate_3: 1.25,
      notes: 'Dummy — kualitas udara baik.',
    },
    {
      id: 'aqt-2', location_id: 'loc-3', test_date: daysAgo(16), officer_id: KADER_ID,
      temperature_1: 30, temperature_2: 31, temperature_3: 31, temperature_unit: 'C',
      humidity_1: 70, humidity_2: 72, humidity_3: 71,
      noise_1: 65, noise_2: 68, noise_3: 66,
      lighting_1: 280, lighting_2: 290, lighting_3: 285,
      pm25_1: 35, pm25_2: 38, pm25_3: 36,
      pm10_1: 60, pm10_2: 63, pm10_3: 61,
      ventilation_rate_1: 0.8, ventilation_rate_2: 0.9, ventilation_rate_3: 0.85,
      notes: 'Dummy — ventilasi kurang, perlu perbaikan.',
    },
  ]

  const foodInspections: Row[] = [
    {
      id: 'fir-1', entry_number: 1, entry_date: daysAgo(12), entry_day: 'Senin',
      jenis_tpp_id: 'tpp-1', address: 'Jl. Melati No. 12', kelurahan_id: 'kel-padasuka',
      rw_id: 'rw-padasuka-01', rt_id: 'rt-padasuka-01-01',
      penanggung_jawab: 'Ahmad Hidayat (Dummy)', phone: '081200000111', hasil_ikl: 'MMS', e_coli_result: 'Negatif',
      samples: [
        { nama_makanan: 'Nasi Timbel (Dummy)', boraks: 'Negatif', formalin: 'Negatif', rodaminB: 'Negatif', metanilYellow: 'Negatif', eColi: 'Negatif', remarks: 'Aman' },
        { nama_makanan: 'Sate Ayam (Dummy)', boraks: 'Negatif', formalin: 'Negatif', rodaminB: 'Negatif', metanilYellow: 'Negatif', eColi: 'Negatif', remarks: 'Aman' },
      ],
      officer_id: DEMO_USER_ID, created_at: stamp(12), updated_at: stamp(12),
    },
    {
      id: 'fir-2', entry_number: 2, entry_date: daysAgo(18), entry_day: 'Kamis',
      jenis_tpp_id: 'tpp-3', address: 'Jl. Anggrek No. 3', kelurahan_id: 'kel-citeureup',
      rw_id: 'rw-citeureup-01', rt_id: 'rt-citeureup-01-01',
      penanggung_jawab: 'Rina Marlina (Dummy)', phone: '081200000222', hasil_ikl: 'TMS', e_coli_result: 'Positif',
      samples: [
        { nama_makanan: 'Bakso (Dummy)', boraks: 'Positif', formalin: 'Negatif', rodaminB: 'Negatif', metanilYellow: 'Negatif', eColi: 'Positif', remarks: 'Perlu tindak lanjut' },
      ],
      officer_id: KADER_ID, created_at: stamp(18), updated_at: stamp(18),
    },
    {
      id: 'fir-3', entry_number: 3, entry_date: daysAgo(25), entry_day: 'Selasa',
      jenis_tpp_id: 'tpp-4', address: 'Jl. Kenanga No. 8', kelurahan_id: 'kel-baros',
      rw_id: 'rw-baros-01', rt_id: 'rt-baros-01-01',
      penanggung_jawab: 'Nia Kurniasih (Dummy)', phone: '081200000333', hasil_ikl: 'MMS', e_coli_result: 'Negatif',
      samples: [
        { nama_makanan: 'Gorengan (Dummy)', boraks: 'Negatif', formalin: 'Negatif', rodaminB: 'Negatif', metanilYellow: 'Negatif', eColi: 'Negatif', remarks: 'Aman' },
        { nama_makanan: 'Es Teh (Dummy)', boraks: 'Negatif', formalin: 'Negatif', rodaminB: 'Negatif', metanilYellow: 'Negatif', eColi: 'Negatif', remarks: 'Aman' },
      ],
      officer_id: DEMO_USER_ID, created_at: stamp(25), updated_at: stamp(25),
    },
  ]

  const pkmInfo: Row[] = [
    {
      id: 'pkm-info-1',
      nama_pkm: 'PKM Kota Cimaahi (Dummy)',
      alamat_pkm: 'Jl. Contoh Alamat No. 1, Kota Cimahi',
      no_telepon: '022-0000-000',
      penanggung_jawab: 'dr. Contoh, SKM (Dummy)',
      website: 'https://example.invalid',
      instagram: '@dummy',
      facebook: null,
      twitter: null,
      logo_url: null,
      logo_storage_path: null,
    },
  ]

  const entryUpdateLogs: Row[] = [
    {
      id: 'eul-1', entry_id: 'entry-1', source_table: 'family_cards',
      changed: { total_jiwa: { old: 3, new: 4 } },
      context: { source: 'demo' }, changed_by: DEMO_USER_ID, changed_by_name: 'User Demo',
      created_at: stamp(2),
    },
    {
      id: 'eul-2', entry_id: 'entry-2', source_table: 'entries',
      changed: { rt_id: { old: 'rt-citeureup-01-01', new: 'rt-citeureup-02-01' } },
      context: { source: 'demo' }, changed_by: KADER_ID, changed_by_name: 'Budi Santoso (Dummy)',
      created_at: stamp(4),
    },
  ]

  return {
    kelurahan,
    rw,
    rt,
    group_tpp: groupTpp,
    locations,
    profiles,
    entries,
    family_cards: familyCards,
    questionnaire_responses: questionnaire,
    water_quality_tests: waterQualityTests,
    air_quality_tests: airQualityTests,
    food_inspection_results: foodInspections,
    pkm_info: pkmInfo,
    entry_update_logs: entryUpdateLogs,
  }
}

// Data dummy untuk modul Laporan Jentik (ABJ). Format CSV ini sengaja dibuat
// identik dengan kolom Google Sheet asli sehingga diparse oleh parser yang sama
// (parseAbjRows). Baris = [ ..., tanggal(1), kelurahan(2), rw(3), diperiksa(4),
// positif(5), negatif(6), abj(8), pelapor(9), lokasiJentik(10), wa(11) ].
export const DEMO_ABJ_SHEET_CSV = [
  'No,Tanggal,Kelurahan,RW,Rumah Diperiksa,Positif Jentik,Negatif Jentik,ABJ,ABJ (%),Pelapor,Lokasi Ditemukan Jentik,No WhatsApp',
  '1,' + daysAgo(2) + ',Padasuka,RW 01,20,3,17,,85,Siti Aminah (Demo),Ember terbuka / bak mandi,081200000001',
  '2,' + daysAgo(4) + ',Padasuka,RW 02,18,1,17,,94.4,Budi Santoso (Demo),Vas tanaman,081200000002',
  '3,' + daysAgo(6) + ',Citeureup,RW 01,25,6,19,,76,Rina Marlina (Demo),Bak penampungan air,081200000003',
  '4,' + daysAgo(9) + ',Citeureup,RW 02,15,0,15,,100,Dedi Supriadi (Demo),Tidak ada,081200000004',
  '5,' + daysAgo(12) + ',Baros,RW 01,22,4,18,,81.8,Nia Kurniasih (Demo),Palung / ember,081200000005',
  '6,' + daysAgo(16) + ',Baros,RW 02,19,2,17,,89.5,Agus Setiawan (Demo),Tandon air,081200000006',
  '7,' + daysAgo(21) + ',Padasuka,RW 01,17,5,12,,70.6,Yuli Rahmawati (Demo),Ember & vas,081200000007',
  '8,' + daysAgo(26) + ',Citeureup,RW 01,21,3,18,,85.7,Tatang Suherman (Demo),Bak kamar mandi,081200000008',
].join('\n')

// Data dummy untuk modul Laporan DBD. Format CSV identik dengan kolom sheet
// asli (parseDbdRows): tanggalSakit(3), nik(4), nama(5), kelamin(6), umur(7),
// kelurahan(12), rw(13), rt(14), tanggalRawat(20), rs(21), tanggalSelesai(22),
// kondisi(23), trombosit(24), gejala(25), wa(29). Kolom lain sengaja dikosongkan.
export const DEMO_DBD_SHEET_CSV = (() => {
  const header: string[] = Array.from({ length: 30 }, (_, i) => `kolom_${i}`)
  header[3] = 'Tanggal Sakit'
  header[4] = 'NIK'
  header[5] = 'Nama'
  header[6] = 'Jenis Kelamin'
  header[7] = 'Umur'
  header[12] = 'Kelurahan'
  header[13] = 'RW'
  header[14] = 'RT'
  header[20] = 'Tanggal Masuk RS'
  header[21] = 'RS'
  header[22] = 'Tanggal Selesai'
  header[23] = 'Kondisi'
  header[24] = 'Trombosit'
  header[25] = 'Gejala'
  header[29] = 'No WhatsApp'

  const pad = (row: Record<number, string>): string => {
    const cells: string[] = Array.from({ length: 30 }, () => '')
    Object.entries(row).forEach(([index, value]) => { cells[Number(index)] = value })
    return cells.join(',')
  }

  const rows = [
    { 3: daysAgo(3), 4: '3273012000000001', 5: 'Ahmad Hidayat (Demo)', 6: 'L', 7: '34', 12: 'Padasuka', 13: 'RW 01', 14: 'RT 01', 20: daysAgo(3), 21: 'RS Demo Kota', 22: daysAgo(1), 23: 'Sembuh', 24: '180.000', 25: 'Demam, ruam', 29: '081200000101' },
    { 3: daysAgo(7), 4: '3273012000000002', 5: 'Rina Marlina (Demo)', 6: 'P', 7: '28', 12: 'Citeureup', 13: 'RW 02', 14: 'RT 01', 20: daysAgo(7), 21: 'RS Demo Kota', 22: daysAgo(4), 23: 'Sembuh', 24: '150.000', 25: 'Demam, nyeri sendi', 29: '081200000102' },
    { 3: daysAgo(13), 4: '3273012000000003', 5: 'Dedi Supriadi (Demo)', 6: 'L', 7: '41', 12: 'Baros', 13: 'RW 01', 14: 'RT 02', 20: daysAgo(13), 21: 'RS Demo Bhakti', 22: daysAgo(9), 23: 'Sembuh', 24: '210.000', 25: 'Demam tinggi', 29: '081200000103' },
    { 3: daysAgo(19), 4: '3273012000000004', 5: 'Nia Kurniasih (Demo)', 6: 'P', 7: '6', 12: 'Padasuka', 13: 'RW 02', 14: 'RT 01', 20: daysAgo(19), 21: 'RS Demo Bhakti', 22: daysAgo(15), 23: 'Sembuh', 24: '95.000', 25: 'Demam, mual', 29: '081200000104' },
    { 3: daysAgo(24), 4: '3273012000000005', 5: 'Agus Setiawan (Demo)', 6: 'L', 7: '52', 12: 'Citeureup', 13: 'RW 01', 14: 'RT 01', 20: daysAgo(24), 21: 'RS Demo Kota', 22: daysAgo(20), 23: 'Sembuh', 24: '175.000', 25: 'Demam, sakit kepala', 29: '081200000105' },
  ]

  return [header.join(','), ...rows.map(pad)].join('\n')
})()

/** Akun yang bisa dipakai login pada mode demo. */
export function buildDemoAuthUsers(): DemoAuthUser[] {
  const createdAt = stamp(90)
  return [
    {
      id: DEMO_USER_ID,
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      created_at: createdAt,
    },
  ]
}
