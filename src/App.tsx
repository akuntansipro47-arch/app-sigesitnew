import { Fragment, useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import './App.css'
import { supabase, supabaseConfigured } from './lib/supabase'
import { exportToExcel } from './utils/exportExcel'
import { loadSettings, saveSettings, DEFAULT_SETTINGS, themes, getThemeById, type AppSettings, type ThemeId, type Language } from './utils/settings'
import { canAccessModule, getDefaultModuleAccess, MODULES, ROLE_LABELS } from './lib/auth'

type View = 'beranda' | 'entry' | 'wilayah' | 'pengguna' | 'profile' | 'lokasi' | 'pangan' | 'uji_air' | 'uji_udara' | 'group_tpp' | 'laporan' | 'laporan_dbd' | 'settings'
type RegionLevel = 'kelurahan' | 'rw' | 'rt'
type Region = { id: string; name: string; code?: string; kelurahanId?: string; rwId?: string }
type UserRole = 'super_admin' | 'admin' | 'kader'
type ModuleAccess = { entry: boolean; wilayah: boolean; pengguna: boolean; lokasi: boolean; uji_air: boolean; uji_udara: boolean; pangan: boolean; group_tpp: boolean }
type UserProfile = {
  id: string
  fullName: string
  username: string
  nik: string
  phone: string
  email: string | null
  role: UserRole
  kelurahanId?: string
  rwId?: string
  rtId?: string
  isActive: boolean
  moduleAccess: ModuleAccess
  isTempPassword?: boolean
  lastPassword?: string | null
}
type ProfileRow = { id: string; full_name: string; username: string; nik: string; phone: string; email: string | null; role: UserRole; kelurahan_id: string | null; rw_id: string | null; rt_id: string | null; is_active: boolean; module_access: Partial<ModuleAccess> | null; is_temp_password: boolean | null; last_password: string | null }

// Location module types
type Location = {
  id: string
  name: string
  code?: string
  address?: string
  kelurahanId?: string
  rwId?: string
  rtId?: string
  latitude?: number
  longitude?: number
  description?: string
}

type LocationRow = { id: string; name: string; code: string | null; address: string | null; kelurahan_id: string | null; rw_id: string | null; rt_id: string | null; latitude: number | null; longitude: number | null; description: string | null }

// Water Quality Test types
type WaterQualityTest = {
  id: string
  locationId: string
  testDate: string
  officerId: string
  waterTemperatureValue?: number | string
  waterTemperatureUnit: 'K' | 'C' | 'F' | 'R'
  airTemperatureValue?: number | string
  airTemperatureUnit: 'K' | 'C' | 'F' | 'R'
  tdsValue?: number | string
  turbidityValue?: number | string
  colorValue?: string
  odorValue?: string
  phValue?: number | string
  nitriteValue?: number | string
  nitrateValue?: number | string
  chromiumValue?: number | string
  ironValue?: number | string
  manganeseValue?: number | string
  chlorineValue?: number | string
  fluorideValue?: number | string
  aluminumValue?: number | string
  eColiValue?: number | string
  coliformValue?: number | string
  notes?: string
}

type WaterQualityTestRow = { id: string; location_id: string; test_date: string; officer_id: string; water_temperature_value: number | string | null; water_temperature_unit: string; air_temperature_value: number | string | null; air_temperature_unit: string; tds_value: number | string | null; turbidity_value: number | string | null; color_value: string | null; odor_value: string | null; ph_value: number | string | null; nitrite_value: number | string | null; nitrate_value: number | string | null; chromium_value: number | string | null; iron_value: number | string | null; manganese_value: number | string | null; chlorine_value: number | string | null; fluoride_value: number | string | null; aluminum_value: number | string | null; e_coli_value: number | string | null; coliform_value: number | string | null; notes: string | null }

// Air Quality Test types
type AirQualityTest = {
  id: string
  locationId: string
  testDate: string
  officerId: string
  temperature1?: number
  temperature2?: number
  temperature3?: number
  temperatureUnit: 'K' | 'C' | 'F' | 'R'
  humidity1?: number
  humidity2?: number
  humidity3?: number
  noise1?: number
  noise2?: number
  noise3?: number
  lighting1?: number
  lighting2?: number
  lighting3?: number
  pm25_1?: number
  pm25_2?: number
  pm25_3?: number
  pm10_1?: number
  pm10_2?: number
  pm10_3?: number
  ventilationRate1?: number
  ventilationRate2?: number
  ventilationRate3?: number
  notes?: string
}

type AirQualityTestRow = { id: string; location_id: string; test_date: string; officer_id: string; temperature_1: number | null; temperature_2: number | null; temperature_3: number | null; temperature_unit: string; humidity_1: number | null; humidity_2: number | null; humidity_3: number | null; noise_1: number | null; noise_2: number | null; noise_3: number | null; lighting_1: number | null; lighting_2: number | null; lighting_3: number | null; pm25_1: number | null; pm25_2: number | null; pm25_3: number | null; pm10_1: number | null; pm10_2: number | null; pm10_3: number | null; ventilation_rate_1: number | null; ventilation_rate_2: number | null; ventilation_rate_3: number | null; notes: string | null }

// Food Inspection types
type FoodInspectionSample = {
  nama_makanan: string
  boraks: 'Positif' | 'Negatif' | ''
  formalin: 'Positif' | 'Negatif' | ''
  rodaminB: 'Positif' | 'Negatif' | ''
  metanilYellow: 'Positif' | 'Negatif' | ''
  eColi: 'Positif' | 'Negatif' | ''
  remarks: string
}

type FoodInspectionResult = {
  id: string
  entryNumber: number
  entryDate: string
  entryDay?: string
  jenisTppId?: string
  address?: string
  kelurahanId?: string
  rwId?: string
  rtId?: string
  penanggungJawab?: string
  phone?: string
  hasilIkl: 'MMS' | 'TMS' | ''
  samples: FoodInspectionSample[]
  officerId: string
  createdAt?: string
  updatedAt?: string
  overallStatus?: 'Lulus' | 'Tidak Lulus / Perlu tindak lanjut'
}

type FoodInspectionResultRow = {
  id: string
  entry_number: number
  entry_date: string
  entry_day: string | null
  jenis_tpp_id: string | null
  address: string | null
  kelurahan_id: string | null
  rw_id: string | null
  rt_id: string | null
  penanggung_jawab: string | null
  phone: string | null
  hasil_ikl: string | null
  e_coli_result: string | null
  samples: any[] | null
  officer_id: string
  created_at: string
  updated_at: string
}

type GroupTpp = {
  id: string
  name: string
}

// PKM Info types
type PKMInfo = {
  id: string
  namaPkm: string
  alamatPkm: string
  noTelepon: string
  penanggungJawab: string
  website?: string
  instagram?: string
  facebook?: string
  twitter?: string
  logoUrl?: string
  logoStoragePath?: string
}

type PKMInfoRow = { id: string; nama_pkm: string; alamat_pkm: string; no_telepon: string; penanggung_jawab: string; website: string | null; instagram: string | null; facebook: string | null; twitter: string | null; logo_url: string | null; logo_storage_path: string | null }

// Entry module types
type FamilyCard = {
  id: string
  entryId: string
  kkSequence: number
  kkNumber: string
  nikKepalaKeluarga: string
  kepalaKeluarga: string
  address: string
  totalJiwa: number
  jiwaMenetap: number
  jambanCount: number
}

type QuestionnaireResponse = {
  id: string
  familyCardId: string
  pillar: string
  questionCode: string
  answer: boolean
}

type Entry = {
  id: string
  entryNumber: number
  entryDate: string
  officerId: string
  kelurahanId: string
  rwId: string
  rtId: string
  familyCards: FamilyCard[]
  questionnaireResponses: QuestionnaireResponse[]
}

// Questionnaire definitions
type Question = {
  code: string
  text: string
}

const questionnaireData: Record<string, Question[]> = {
  fasilitas_jamban: [
    { code: 'bab_di_jamban', text: 'Buang Air Besar di Jamban' },
    { code: 'jamban_milik_sendiri', text: 'Jamban Milik Sendiri' },
    { code: 'kloset_leher_angsa', text: 'Kloset Leher Angsa' },
  ],
  jamban: [
    { code: 'septik_sedot_3_5_tahun', text: 'Tangki septik disedot setidaknya sekali dalam 3-5 tahun terakhir' },
    { code: 'septik_sedot_5_tahun', text: 'Tangki septik yang tidak pernah disedot, atau disedot > dari 5 tahun terakhir' },
    { code: 'cubluk_lubang_tanah', text: 'Cubluk / Lubang Tanah' },
    { code: 'buang_ke_drainase', text: 'Dibuang langsung ke drainase' },
  ],
  ctps: [
    { code: 'sarana_ctps', text: 'Memiliki Sarana CTPS' },
    { code: 'air_mengalir', text: 'Memiliki Air Mengalir' },
    { code: 'sabun', text: 'Memiliki Sabun' },
    { code: 'praktek_ctps', text: 'Mampu praktek CTPS' },
    { code: 'ctps_sebelum_makan', text: 'CTPS sebelum makan' },
    { code: 'ctps_setelah_makan', text: 'CTPS setelah makan' },
    { code: 'ctps_sebelum_mengolah_pangan', text: 'CTPS sebelum mengolah pangan' },
    { code: 'ctps_sebelum_menyusui', text: 'CTPS sebelum menyusui' },
    { code: 'ctps_setelah_bab', text: 'CTPS setelah BAB' },
  ],
  sumber_air: [
    { code: 'perpipaan', text: 'Layak : Perpipaan' },
    { code: 'kran_umum', text: 'Layak : Kran Umum' },
    { code: 'sumur_gali_terlindung', text: 'Layak : Sumur Gali Terlindung (SG)' },
    { code: 'sumur_gali_pompa', text: 'Layak : Sumur Gali dengan Pompa (SGL)' },
    { code: 'sumur_bor_pompa', text: 'Layak : Sumur Bor dengan Pompa (SPL)' },
    { code: 'mata_air_terlindung', text: 'Layak : Mata Air Terlindung' },
    { code: 'air_hujan', text: 'Layak : Air Hujan' },
    { code: 'sungai_tidak_terlindung', text: 'Tidak Layak : Sungai / Mata Air Tidak Terlindungi' },
    { code: 'air_diolah', text: 'Air diolah/Dimasak' },
    { code: 'air_keruh_diendapkan', text: 'Air baku keruh diendapkan/disaring' },
    { code: 'air_disimpan_tertutup', text: 'Air disimpan tertutup' },
    { code: 'makanan_tertutup', text: 'Makanan tertutup' },
    { code: 'pisah_b3', text: 'Pisah dari B3' },
    { code: '5_kunci_pangan', text: 'Terapkan 5 kunci Pangan' },
  ],
  sampah: [
    { code: 'sampah_tidak_berserakan', text: 'Sampah tidak berserakan' },
    { code: 'tempat_sampah_tertutup', text: 'Tempat sampah tertutup' },
    { code: 'sampah_diolah_aman', text: 'Sampah diolah aman' },
    { code: 'sampah_dipilah', text: 'Sampah dipilah' },
  ],
  limbah: [
    { code: 'tidak_genangan_limbah', text: 'Tidak ada genangan limbah' },
    { code: 'saluran_limbah_kedap', text: 'Saluran limbah kedap' },
    { code: 'resapan_ipal', text: 'Ada resapan /IPAL' },
  ],
  pkurt: [
    { code: 'jendela_kamar_dibuka', text: 'Jendela kamar dibuka' },
    { code: 'jendela_ruang_keluarga_dibuka', text: 'Jendela ruang keluarga dibuka' },
    { code: 'ventilasi', text: 'Ada Ventilasi' },
    { code: 'lubang_asap_dapur', text: 'Ada lubang asap dapur' },
    { code: 'cahaya_alami', text: 'Ada Cahaya alami' },
    { code: 'tidak_merokok', text: 'Tidak merokok dirumah' },
  ],
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id, fullName: row.full_name, username: row.username, nik: row.nik, phone: row.phone, email: row.email,
    role: row.role, kelurahanId: row.kelurahan_id ?? undefined, rwId: row.rw_id ?? undefined, rtId: row.rt_id ?? undefined,
    isActive: row.is_active,
    moduleAccess: { ...getDefaultModuleAccess(row.role), ...row.module_access },
    isTempPassword: row.is_temp_password ?? false,
    lastPassword: row.last_password ?? null,
  }
}

function mapLocationRow(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    address: row.address ?? undefined,
    kelurahanId: row.kelurahan_id ?? undefined,
    rwId: row.rw_id ?? undefined,
    rtId: row.rt_id ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    description: row.description ?? undefined,
  }
}

function mapWaterQualityTestRow(row: WaterQualityTestRow): WaterQualityTest {
  return {
    id: row.id,
    locationId: row.location_id,
    testDate: row.test_date,
    officerId: row.officer_id,
    // Handle both new and old column structure for backward compatibility
    waterTemperatureValue: row.water_temperature_value ?? (row as any).temperature_value ?? undefined,
    waterTemperatureUnit: (row.water_temperature_unit ?? (row as any).temperature_unit ?? 'C') as 'K' | 'C' | 'F' | 'R',
    airTemperatureValue: row.air_temperature_value ?? undefined,
    airTemperatureUnit: (row.air_temperature_unit ?? 'C') as 'K' | 'C' | 'F' | 'R',
    tdsValue: row.tds_value ?? undefined,
    turbidityValue: row.turbidity_value ?? undefined,
    colorValue: row.color_value ?? undefined,
    odorValue: row.odor_value ?? undefined,
    phValue: row.ph_value ?? undefined,
    nitriteValue: row.nitrite_value ?? undefined,
    nitrateValue: row.nitrate_value ?? undefined,
    chromiumValue: row.chromium_value ?? undefined,
    ironValue: row.iron_value ?? undefined,
    manganeseValue: row.manganese_value ?? undefined,
    chlorineValue: row.chlorine_value ?? undefined,
    fluorideValue: row.fluoride_value ?? undefined,
    aluminumValue: row.aluminum_value ?? undefined,
    eColiValue: row.e_coli_value ?? undefined,
    coliformValue: row.coliform_value ?? undefined,
    notes: row.notes ?? undefined,
  }
}

// Aturan baru: kolom entry Uji Air hanya boleh berisi angka atau simbol matematika:
// <, >, =, +, -, /, koma, titik
// Catatan dikecualikan (bebas).
const ujiAirEntryPattern = /^[0-9<>=+\-\/,.]*$/

function isEmptyUjiAirValue(value: unknown) {
  return value === null || value === undefined || value === ''
}

function isUjiAirValueValid(input: string, _mode: 'partial' | 'final') {
  // mode tetap dipertahankan agar pemanggil lama tidak error,
  // namun aturan validasinya sekarang sama untuk partial/final.
  const next = input.replace(/\s+/g, '')
  if (next === '') return true
  return ujiAirEntryPattern.test(next)
}

function toDbTextValue(input: string) {
  const trimmed = input.trim()
  return trimmed === '' ? null : trimmed
}

function toDbUjiAirValue(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  // Simpan apa adanya agar tampilan tabel bisa benar-benar sama seperti input user
  // (misalnya: "001", "<", ">/", dsb).
  return trimmed
}

function formatWaterValue(value: number | string | null | undefined, unit?: string) {
  // Rule tampilan: kosong/null -> tampilkan "-" (akan di-highlight via class uji-empty-cell)
  if (isEmptyUjiAirValue(value)) return '-'
  const text = typeof value === 'number' ? String(value) : String(value).trim()
  if (text === '') return '-'
  return unit ? `${text} ${unit}` : text
}

function isEmptyUjiUdaraValue(value: number | undefined) {
  return value === undefined
}

function hasEmptyUjiUdaraValues(values: Array<number | undefined>) {
  return values.some(isEmptyUjiUdaraValue)
}

// Nilai uji udara adalah numerik opsional. Terima koma desimal ala Indonesia
// ("25,5" -> 25.5), tolak teks non-numerik agar tidak lolos jadi NaN ke DB.
function parseUjiUdaraNumber(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const normalized = trimmed.replace(/,/g, '.')
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(normalized)) return 'invalid'
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 'invalid'
}

function formatUjiUdaraValues(values: Array<number | undefined>): ReactNode {
  return values.map((value, index) => (
    <span key={index}>
      {index > 0 && '/'}
      {isEmptyUjiUdaraValue(value)
        ? <span className="uji-udara-empty-value">-</span>
        : value}
    </span>
  ))
}

function mapAirQualityTestRow(row: AirQualityTestRow): AirQualityTest {
  return {
    id: row.id,
    locationId: row.location_id,
    testDate: row.test_date,
    officerId: row.officer_id,
    temperature1: row.temperature_1 ?? undefined,
    temperature2: row.temperature_2 ?? undefined,
    temperature3: row.temperature_3 ?? undefined,
    temperatureUnit: row.temperature_unit as 'K' | 'C' | 'F' | 'R',
    humidity1: row.humidity_1 ?? undefined,
    humidity2: row.humidity_2 ?? undefined,
    humidity3: row.humidity_3 ?? undefined,
    noise1: row.noise_1 ?? undefined,
    noise2: row.noise_2 ?? undefined,
    noise3: row.noise_3 ?? undefined,
    lighting1: row.lighting_1 ?? undefined,
    lighting2: row.lighting_2 ?? undefined,
    lighting3: row.lighting_3 ?? undefined,
    pm25_1: row.pm25_1 ?? undefined,
    pm25_2: row.pm25_2 ?? undefined,
    pm25_3: row.pm25_3 ?? undefined,
    pm10_1: row.pm10_1 ?? undefined,
    pm10_2: row.pm10_2 ?? undefined,
    pm10_3: row.pm10_3 ?? undefined,
    ventilationRate1: row.ventilation_rate_1 ?? undefined,
    ventilationRate2: row.ventilation_rate_2 ?? undefined,
    ventilationRate3: row.ventilation_rate_3 ?? undefined,
    notes: row.notes ?? undefined,
  }
}

function mapFoodInspectionRow(row: FoodInspectionResultRow): FoodInspectionResult {
  const rawSamples = row.samples && Array.isArray(row.samples) ? row.samples : []
  const samples: FoodInspectionSample[] = rawSamples.map((s: any) => ({
    nama_makanan: String(s?.nama_makanan ?? s?.jenis_makanan ?? s?.nama ?? ''),
    boraks: (s?.boraks ?? '') as 'Positif' | 'Negatif' | '',
    formalin: (s?.formalin ?? '') as 'Positif' | 'Negatif' | '',
    rodaminB: (s?.rodamin_b ?? s?.rodaminB ?? '') as 'Positif' | 'Negatif' | '',
    metanilYellow: (s?.metanil_yellow ?? s?.metanilYellow ?? '') as 'Positif' | 'Negatif' | '',
    eColi: (s?.e_coli ?? s?.eColi ?? '') as 'Positif' | 'Negatif' | '',
    remarks: String(s?.remarks ?? s?.keterangan ?? ''),
  }))

  if (samples.length === 0 && row.e_coli_result) {
    samples.push({
      nama_makanan: '',
      boraks: '',
      formalin: '',
      rodaminB: '',
      metanilYellow: '',
      eColi: row.e_coli_result as 'Positif' | 'Negatif' | '',
      remarks: '',
    })
  } else if (samples.length > 0 && !samples[0].eColi && row.e_coli_result) {
    samples[0].eColi = row.e_coli_result as 'Positif' | 'Negatif' | ''
  }

  const hasPositive = samples.some(s =>
    s.boraks === 'Positif' || s.formalin === 'Positif' ||
    s.rodaminB === 'Positif' || s.metanilYellow === 'Positif' || s.eColi === 'Positif'
  )
  const overallStatus = hasPositive ? 'Tidak Lulus / Perlu tindak lanjut' : 'Lulus'

  return {
    id: row.id,
    entryNumber: row.entry_number,
    entryDate: row.entry_date,
    entryDay: row.entry_day ?? undefined,
    jenisTppId: row.jenis_tpp_id ?? undefined,
    address: row.address ?? undefined,
    kelurahanId: row.kelurahan_id ?? undefined,
    rwId: row.rw_id ?? undefined,
    rtId: row.rt_id ?? undefined,
    penanggungJawab: row.penanggung_jawab ?? undefined,
    phone: row.phone ?? undefined,
    hasilIkl: (row.hasil_ikl ?? '') as 'MMS' | 'TMS' | '',
    samples,
    officerId: row.officer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    overallStatus,
  }
}

function mapPKMInfoRow(row: PKMInfoRow): PKMInfo {
  return {
    id: row.id,
    namaPkm: row.nama_pkm,
    alamatPkm: row.alamat_pkm,
    noTelepon: row.no_telepon,
    penanggungJawab: row.penanggung_jawab,
    website: row.website ?? undefined,
    instagram: row.instagram ?? undefined,
    facebook: row.facebook ?? undefined,
    twitter: row.twitter ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    logoStoragePath: row.logo_storage_path ?? undefined,
  }
}

async function getFunctionErrorMessage(error: unknown): Promise<string | null> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = error.context
    if (!context || typeof context !== 'object' || !('json' in context) || typeof context.json !== 'function') {
      return error instanceof Error ? error.message : null
    }
    try {
      const response = context as { clone?: () => { json: () => Promise<unknown> }; json: () => Promise<unknown> }
      const body = await (response.clone ? response.clone().json() : response.json()) as { error?: unknown }
      if (typeof body.error === 'string') return body.error
    } catch {
      // The function did not return a JSON error body.
    }
  }
  return error instanceof Error ? error.message : null
}

// --- Penanganan sesi untuk edge function admin-users -------------------------
// Pesan "Tidak terautentikasi" berasal dari fungsi ketika JWT yang dikirim tidak
// valid/kedaluwarsa. Sering terjadi karena token 1 jam kedaluwarsa sementara
// refresh token belum sempat (atau gagal) diperbarui. Kita refresh proaktif,
// serialize agar tidak balapan, dan beri pesan yang jelas bila refresh gagal.

function getFunctionStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context
    if (context && typeof context === 'object' && 'status' in context) {
      const status = (context as { status?: unknown }).status
      if (typeof status === 'number') return status
    }
  }
  return null
}

/** Sisa umur access token (detik) dari klaim `exp`; null bila tidak bisa dibaca. */
function tokenSecondsLeft(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return typeof claims.exp === 'number' ? claims.exp - Math.floor(Date.now() / 1000) : null
  } catch {
    return null
  }
}

const SESSION_HELP = 'Sesi login Anda sudah tidak berlaku. Silakan klik "Keluar" lalu masuk kembali.'

type TokenRefresh = { token: string | null; reason: string | null }
let activeTokenRefresh: Promise<TokenRefresh> | null = null

/** Refresh sesi dengan single-flight supaya dua permintaan bersamaan tidak balapan. */
function refreshAccessToken(client: NonNullable<typeof supabase>): Promise<TokenRefresh> {
  if (!activeTokenRefresh) {
    activeTokenRefresh = (async (): Promise<TokenRefresh> => {
      try {
        const { data, error } = await client.auth.refreshSession()
        if (error) {
          console.warn('[auth] Refresh token gagal:', error.message)
          return { token: null, reason: error.message }
        }
        const token = data.session?.access_token ?? null
        if (!token) return { token: null, reason: 'Sesi baru tidak ditemukan' }
        console.log('[auth] Token diperbarui, sisa umur:', tokenSecondsLeft(token), 'detik')
        return { token, reason: null }
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Refresh token gagal'
        console.warn('[auth] Refresh token error:', reason)
        return { token: null, reason }
      }
    })().finally(() => {
      activeTokenRefresh = null
    })
  }
  return activeTokenRefresh
}

function isUnauthenticated(message: string | null, status: number | null): boolean {
  if (status === 401) return true
  if (!message) return false
  return message === 'Tidak terautentikasi'
    || message === 'Invalid JWT'
    || /\b(jwt|token)\b.*\b(invalid|expired|malformed|not authenticated)\b/i.test(message)
}

async function invokeAdminUsers(payload: Record<string, unknown>) {
  if (!supabase) {
    return {
      data: null,
      error: new Error('Koneksi Supabase belum tersedia.'),
    }
  }
  const client = supabase

  // Ambil token yang masih berlaku; refresh proaktif bila tinggal < 60 detik.
  const readAccessToken = async (): Promise<TokenRefresh> => {
    const { data: sessionData } = await client.auth.getSession()
    const token = sessionData.session?.access_token ?? null
    if (!token) return refreshAccessToken(client)

    const left = tokenSecondsLeft(token)
    if (left !== null && left < 60) {
      console.log(`[auth] Token hampir kedaluwarsa (${left}s), refresh proaktif.`)
      const refreshed = await refreshAccessToken(client)
      // Jika refresh gagal, tetap coba dengan token lama; respons fungsi yang memastikan.
      if (!refreshed.token) console.warn('[auth] Refresh proaktif gagal, memakai token lama:', refreshed.reason)
      return refreshed.token ? refreshed : { token, reason: refreshed.reason }
    }
    return { token, reason: null }
  }

  const invokeWithToken = (accessToken: string) =>
    client.functions.invoke('admin-users', {
      body: payload,
      headers: { Authorization: `Bearer ${accessToken}` },
    })

  const read = await readAccessToken()
  if (!read.token) {
    return { data: null, error: new Error(read.reason ? `${SESSION_HELP} (${read.reason})` : SESSION_HELP) }
  }

  let accessToken = read.token
  let response = await invokeWithToken(accessToken)
  const initialError = response.error ? await getFunctionErrorMessage(response.error) : null
  const initialResultError = (response.data as { error?: string } | null)?.error ?? null

  if (isUnauthenticated(initialError ?? initialResultError, getFunctionStatus(response.error))) {
    console.warn('[auth] admin-users menolak token, refresh ulang lalu coba lagi.', {
      initialError,
      initialResultError,
      tokenSisa: tokenSecondsLeft(accessToken),
    })
    const refreshed = await refreshAccessToken(client)
    if (!refreshed.token) {
      return { data: null, error: new Error(`${SESSION_HELP} (${refreshed.reason ?? 'token tidak valid'})`) }
    }

    accessToken = refreshed.token
    response = await invokeWithToken(accessToken)
    const retryError = response.error ? await getFunctionErrorMessage(response.error) : null
    const retryResultError = (response.data as { error?: string } | null)?.error ?? null
    if (isUnauthenticated(retryError ?? retryResultError, getFunctionStatus(response.error))) {
      // Token sudah fresh tetapi tetap ditolak → kemungkinan konfigurasi/env fungsi.
      console.error('[auth] Token baru tetap ditolak admin-users.', { retryError, retryResultError })
      return { data: null, error: new Error(`${SESSION_HELP} (token baru tetap ditolak)`) }
    }
  }

  return response
}

const initialKelurahan: Region[] = [{ id: 'kel-1', name: 'Padasuka', code: '3273011001' }]
const initialRw: Region[] = [
  { id: 'rw-1', name: '01', kelurahanId: 'kel-1' },
  { id: 'rw-5', name: '05', kelurahanId: 'kel-1' },
]
const initialRt: Region[] = [
  { id: 'rt-1', name: '01', rwId: 'rw-5' },
  { id: 'rt-2', name: '02', rwId: 'rw-5' },
  { id: 'rt-3', name: '03', rwId: 'rw-5' },
]



function App() {
  const [view, setView] = useState<View>('beranda')
  const [online, setOnline] = useState(true)
  const [kelurahan, setKelurahan] = useState(initialKelurahan)
  const [rw, setRw] = useState(initialRw)
  const [rt, setRt] = useState(initialRt)
  const [regionsLoaded, setRegionsLoaded] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [waterTests, setWaterTests] = useState<WaterQualityTest[]>([])
  const [airTests, setAirTests] = useState<AirQualityTest[]>([])
  const [foodInspections, setFoodInspections] = useState<FoodInspectionResult[]>([])
  
  const reloadLocations = useCallback(async () => {
    if (!supabaseConfigured || !supabase) return
    try {
      console.log('Loading locations from database...')
      const { data, error } = await supabase.from('locations').select('*')
      console.log('Load locations result:', { data, error: error?.message, dataLength: data?.length })

      if (error) {
        console.error('Error loading locations:', error)
        return
      }

      if (data && data.length > 0) {
        const mapped = (data as LocationRow[]).map(mapLocationRow)
        // Sort numerik (mis: 1., 2., 10.) agar urutan tidak loncat 1 → 10.
        mapped.sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { numeric: true, sensitivity: 'base' }))
        setLocations(mapped)
        console.log('Locations loaded successfully:', data.length)
      } else {
        setLocations([])
        console.log('No locations found in database')
      }
    } catch (err) {
      console.error('Unexpected error loading locations:', err)
    }
  }, [])

  // Apply theme settings on app load
  useEffect(() => {
    const settings = loadSettings()
    const theme = getThemeById(settings.theme)
    document.documentElement.style.setProperty('--forest', theme.colors.primary)
    document.documentElement.style.setProperty('--teal', theme.colors.primaryLight)
    document.documentElement.style.setProperty('--mint', theme.colors.primaryBg)
    document.documentElement.style.setProperty('--ink', theme.colors.text)
    document.documentElement.style.setProperty('--muted', theme.colors.textSecondary)
    document.documentElement.style.setProperty('--line', theme.colors.border)
    document.documentElement.style.setProperty('--paper', theme.colors.surface)
    document.documentElement.style.fontFamily = settings.fontFamily
  }, [])
  const [pkmInfo, setPkmInfo] = useState<PKMInfo | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [, setProfileLoaded] = useState(!supabaseConfigured)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false)

  const reloadWaterTests = useCallback(async () => {
    if (!supabaseConfigured || !supabase || !profile) return
    try {
      console.log('Loading water quality tests for officer:', profile.id)
      let waterQuery = supabase.from('water_quality_tests').select('*')
      if (profile.role === 'kader') waterQuery = waterQuery.eq('officer_id', profile.id)
      const { data, error } = await waterQuery.order('test_date', { ascending: false })
      console.log('Load water quality tests result:', { data, error: error?.message, dataLength: data?.length })

      if (error) {
        console.error('Error loading water quality tests:', error)
        return
      }

      if (data && data.length > 0) {
        setWaterTests((data as WaterQualityTestRow[]).map(mapWaterQualityTestRow))
        console.log('Water quality tests loaded successfully:', data.length)
      } else {
        setWaterTests([])
        console.log('No water quality tests found')
      }
    } catch (err) {
      console.error('Unexpected error loading water quality tests:', err)
    }
  }, [profile])

  const reloadAirTests = useCallback(async () => {
    if (!supabaseConfigured || !supabase || !profile) return
    try {
      console.log('Loading air quality tests for officer:', profile.id)
      let airQuery = supabase.from('air_quality_tests').select('*')
      if (profile.role === 'kader') airQuery = airQuery.eq('officer_id', profile.id)
      const { data, error } = await airQuery.order('test_date', { ascending: false })
      console.log('Load air quality tests result:', { data, error: error?.message, dataLength: data?.length })

      if (error) {
        console.error('Error loading air quality tests:', error)
        return
      }

      if (data && data.length > 0) {
        setAirTests((data as AirQualityTestRow[]).map(mapAirQualityTestRow))
        console.log('Air quality tests loaded successfully:', data.length)
      } else {
        setAirTests([])
        console.log('No air quality tests found')
      }
    } catch (err) {
      console.error('Unexpected error loading air quality tests:', err)
    }
  }, [profile])

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    
    const data = new FormData(event.currentTarget)
    const currentPassword = String(data.get('currentPassword') ?? '')
    const newPassword = String(data.get('newPassword') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')
    
    setChangePasswordError('')
    
    if (newPassword !== confirmPassword) {
      setChangePasswordError('Kata sandi baru tidak cocok dengan konfirmasi.')
      return
    }
    
    if (newPassword.length < 8) {
      setChangePasswordError('Kata sandi baru minimal 8 karakter.')
      return
    }
    
    setChangePasswordSubmitting(true)
    
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email || '',
        password: currentPassword
      })
      
      if (signInError) {
        setChangePasswordError('Kata sandi saat ini salah.')
        setChangePasswordSubmitting(false)
        return
      }
      
      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (updateError) {
        setChangePasswordError('Gagal memperbarui kata sandi: ' + updateError.message)
        setChangePasswordSubmitting(false)
        return
      }
      
      // Update the is_temp_password flag in profiles.
      // Catatan keamanan: jangan pernah menyimpan plaintext password di database.
      const { error: profileError } = await supabase.from('profiles').update({
        is_temp_password: false,
      }).eq('id', profile.id)
      
      if (profileError) {
        setChangePasswordError('Gagal memperbarui status kata sandi: ' + profileError.message)
        setChangePasswordSubmitting(false)
        return
      }
      
      // Update local profile state
      setProfile({ ...profile, isTempPassword: false })
      setShowChangePassword(false)
      alert('Kata sandi berhasil diubah!')
    } catch (err) {
      setChangePasswordError('Terjadi kesalahan: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setChangePasswordSubmitting(false)
    }
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!supabase || !session) { setProfile(null); setProfileLoaded(true); profileSessionRef.current = null; return }
      // Retry profile loading with delay if initial load fails
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        console.log('Load profile result:', { data, error: error?.message, userId: session.user.id, attempt: i + 1 })
        if (!error && data) {
          const profileData = mapProfileRow(data as ProfileRow)
          setProfile(profileData)
          setProfileLoaded(true)
          // Tampilkan modal ganti password hanya saat sesi user baru terbentuk
          // (login). Pembacaan ulang dalam sesi yang sama tidak boleh
          // memunculkan ulang modal dari data basi.
          if (profileData.isTempPassword && profileSessionRef.current !== session.user.id) {
            setShowChangePassword(true)
          }
          profileSessionRef.current = session.user.id
          return
        }
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 500))
      }
      // If all retries fail, create a basic profile object for fallback
      console.warn('Profile loading failed after retries, using fallback')
      setProfile({
        id: session.user.id,
        fullName: 'User',
        username: session.user.email?.split('@')[0] || 'user',
        nik: '',
        phone: '',
        email: session.user.email || null,
        role: 'kader',
        isActive: true,
        moduleAccess: getDefaultModuleAccess('kader')
      })
    }
    void loadProfile()
  }, [session])

  const reloadRegions = useCallback(async () => {
    async function loadRegions() {
      if (supabaseConfigured && supabase) {
        try {
          console.log('Loading regions from database...')
          const [kelurahanResult, rwResult, rtResult] = await Promise.all([
            supabase.from('kelurahan').select('id, name, code').order('name'),
            supabase.from('rw').select('id, number, kelurahan_id'),
            supabase.from('rt').select('id, number, rw_id'),
          ])
          console.log('Regions load result:', { 
            kelurahanError: kelurahanResult.error?.message, 
            rwError: rwResult.error?.message, 
            rtError: rtResult.error?.message,
            kelurahanCount: kelurahanResult.data?.length,
            rwCount: rwResult.data?.length,
            rtCount: rtResult.data?.length
          })
          
          if (!kelurahanResult.error && !rwResult.error && !rtResult.error) {
            const kelurahanData = kelurahanResult.data.map((item) => ({ id: item.id, name: item.name, code: item.code }))
            setKelurahan(kelurahanData)
            
            // Sort RW by kelurahan name, then by number
            const rwData = rwResult.data.map((item) => ({ id: item.id, name: item.number, kelurahanId: item.kelurahan_id }))
            rwData.sort((a, b) => {
              const kelurahanA = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === a.kelurahanId)?.name || ''
              const kelurahanB = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === b.kelurahanId)?.name || ''
              if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
              const numA = parseInt(a.name, 10) || 0
              const numB = parseInt(b.name, 10) || 0
              return numA - numB
            })
            setRw(rwData)
            
            // Sort RT by kelurahan name, then RW number, then RT number
            const rtData = rtResult.data.map((item) => ({ id: item.id, name: item.number, rwId: item.rw_id }))
            rtData.sort((a, b) => {
              const rwA = rwData.find((r) => r.id === a.rwId)
              const rwB = rwData.find((r) => r.id === b.rwId)
              const kelurahanA = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === rwA?.kelurahanId)?.name || ''
              const kelurahanB = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === rwB?.kelurahanId)?.name || ''
              if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
              if (rwA?.name !== rwB?.name) {
                const rwNumA = parseInt(rwA?.name || '0', 10) || 0
                const rwNumB = parseInt(rwB?.name || '0', 10) || 0
                return rwNumA - rwNumB
              }
              const rtNumA = parseInt(a.name, 10) || 0
              const rtNumB = parseInt(b.name, 10) || 0
              return rtNumA - rtNumB
            })
            setRt(rtData)
            
            setRegionsLoaded(true)
            console.log('Regions loaded successfully from database')
            return
          } else {
            console.error('Error loading regions:', { kelurahanError: kelurahanResult.error, rwError: rwResult.error, rtError: rtResult.error })
          }
        } catch (err) {
          console.error('Unexpected error loading regions:', err)
        }
      }
      // Fallback to localStorage if Supabase fails or not configured
      console.log('Using fallback to localStorage for regions')
      const stored = localStorage.getItem('sigesit-regions')
      if (stored) {
        const data = JSON.parse(stored) as { kelurahan: Region[]; rw: Region[]; rt: Region[] }
        setKelurahan(data.kelurahan)
        
        // Sort RW even when loading from localStorage
        const sortedRw = [...data.rw]
        sortedRw.sort((a, b) => {
          const kelurahanA = data.kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === a.kelurahanId)?.name || ''
          const kelurahanB = data.kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === b.kelurahanId)?.name || ''
          if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
          const numA = parseInt(a.name, 10) || 0
          const numB = parseInt(b.name, 10) || 0
          return numA - numB
        })
        setRw(sortedRw)
        
        // Sort RT even when loading from localStorage
        const sortedRt = [...data.rt]
        sortedRt.sort((a, b) => {
          const rwA = sortedRw.find((r) => r.id === a.rwId)
          const rwB = sortedRw.find((r) => r.id === b.rwId)
          const kelurahanA = data.kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === rwA?.kelurahanId)?.name || ''
          const kelurahanB = data.kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === rwB?.kelurahanId)?.name || ''
          if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
          if (rwA?.name !== rwB?.name) {
            const rwNumA = parseInt(rwA?.name || '0', 10) || 0
            const rwNumB = parseInt(rwB?.name || '0', 10) || 0
            return rwNumA - rwNumB
          }
          const rtNumA = parseInt(a.name, 10) || 0
          const rtNumB = parseInt(b.name, 10) || 0
          return rtNumA - rtNumB
        })
        setRt(sortedRt)
      }
      setRegionsLoaded(true)
    }
    void loadRegions()
  }, [])

  useEffect(() => {
    void reloadRegions()
  }, [reloadRegions])

  useEffect(() => {
    if (regionsLoaded && !supabaseConfigured) {
      localStorage.setItem('sigesit-regions', JSON.stringify({ kelurahan, rw, rt }))
    }
  }, [kelurahan, rw, rt, regionsLoaded])

  // Locations are protected by RLS (has_module_access(auth.uid(), 'lokasi')), so they can only be
  // read once a session/profile exists. Loading them at mount (pre-auth) returned zero rows, which
  // is why Uji Air/Udara showed "Lokasi tidak ditemukan" until a manual refresh.
  const authUserId = session?.user.id ?? null
  const profileId = profile?.id ?? null
  useEffect(() => {
    if (!authUserId) return
    void reloadLocations()
  }, [reloadLocations, authUserId, profileId])

  // Regions are RLS-gated like locations: the mount load can run before the
  // session is ready and return zero rows, leaving kelurahan/RW/RT selects
  // empty until a manual refresh. Reload once auth becomes available.
  const regionsAuthReloaded = useRef(false)
  // Mencegah modal ganti-password muncul dari pembacaan profil basi dalam sesi
  // yang sama (mis. re-auth saat verifikasi password lama). Modal hanya
  // otomatis tampil saat sesi user baru terbentuk (login).
  const profileSessionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!authUserId) return
    if (regionsAuthReloaded.current) return
    regionsAuthReloaded.current = true
    void reloadRegions()
  }, [reloadRegions, authUserId])

  useEffect(() => {
    async function loadPKMInfo() {
      if (supabaseConfigured && supabase) {
        try {
          console.log('Loading PKM info from database...')
          const { data, error } = await supabase.from('pkm_info').select('*').single()
          console.log('Load PKM info result:', { data, error: error?.message })
          
          if (error) {
            console.error('Error loading PKM info:', error)
            // This is expected if no PKM info exists yet
            console.log('No PKM info found, will use defaults')
          } else if (data) {
            setPkmInfo(mapPKMInfoRow(data as PKMInfoRow))
            console.log('PKM info loaded successfully')
          }
        } catch (err) {
          console.error('Unexpected error loading PKM info:', err)
        }
      }
    }
    void loadPKMInfo()
  }, [])

  // Auto-load water tests when switching to uji_air view
  useEffect(() => {
    if (view === 'uji_air' && locations.length > 0) {
      void reloadWaterTests()
    }
  }, [view, reloadWaterTests, locations.length])

  // Auto-load air tests when switching to uji_udara view
  useEffect(() => {
    if (view === 'uji_udara' && locations.length > 0) {
      void reloadAirTests()
    }
  }, [view, reloadAirTests, locations.length])

  // Reload tests when locations are loaded (to fix location display issue)
  useEffect(() => {
    if (locations.length > 0) {
      if (view === 'uji_air') {
        void reloadWaterTests()
      }
      if (view === 'uji_udara') {
        void reloadAirTests()
      }
    }
  }, [locations.length, view, reloadWaterTests, reloadAirTests])

  // Redirect away from views the current role is not allowed to open
  useEffect(() => {
    if (!profile) return
    const guarded: Partial<Record<View, keyof ModuleAccess>> = {
      entry: 'entry', wilayah: 'wilayah', pengguna: 'pengguna', lokasi: 'lokasi',
      uji_air: 'uji_air', uji_udara: 'uji_udara', pangan: 'pangan', group_tpp: 'group_tpp',
    }
    const moduleKey = guarded[view]
    if (moduleKey && !canAccessModule(profile, moduleKey)) setView('beranda')
    if (view === 'laporan' && profile.role === 'kader') setView('beranda')
    if (view === 'laporan_dbd' && profile.role === 'kader') setView('beranda')
  }, [profile, view])

  if (supabaseConfigured && !authReady) return <main className="auth-shell"><p className="auth-loading">Memuat sesi…</p></main>
  if (supabaseConfigured && !session) return <LoginPage />
  if (supabaseConfigured && !profile) return <main className="auth-shell"><p className="auth-loading">Memuat profil…</p></main>

  const displayName = profile?.fullName ?? 'Syifa Zahra'
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  // When Supabase is not configured there is no profile; keep the UI fully browsable (demo mode).
  const demoMode = !profile
  const access = {
    entry: demoMode || canAccessModule(profile, 'entry'),
    wilayah: demoMode || canAccessModule(profile, 'wilayah'),
    pengguna: demoMode || canAccessModule(profile, 'pengguna'),
    lokasi: demoMode || canAccessModule(profile, 'lokasi'),
    uji_air: demoMode || canAccessModule(profile, 'uji_air'),
    uji_udara: demoMode || canAccessModule(profile, 'uji_udara'),
    pangan: demoMode || canAccessModule(profile, 'pangan'),
    group_tpp: demoMode || canAccessModule(profile, 'group_tpp'),
    laporan: demoMode || profile?.role !== 'kader',
    laporan_dbd: demoMode || profile?.role !== 'kader',
  }
  const showPemeriksaan = access.uji_air || access.uji_udara || access.pangan
  const showDataMaster = access.wilayah || access.lokasi || access.group_tpp || access.pengguna
  const pkmName = 'KOTA CIMAHI'
  const pkmLogo = pkmInfo?.logoUrl

  return <main className="app-shell">
    {/* Change Password Modal for Temporary Password */}
    {showChangePassword && (
      <div className="modal-overlay">
        <div className="modal-content auth-card" style={{ maxWidth: '400px', margin: '100px auto' }}>
          <h2>Ubah Kata Sandi</h2>
          <p>Anda harus mengubah kata sandi sementara sebelum melanjutkan.</p>
          {changePasswordError && <div className="auth-error">{changePasswordError}</div>}
          <form onSubmit={handleChangePassword}>
            <label>
              Kata sandi saat ini
              <input name="currentPassword" required type="password" autoComplete="current-password" />
            </label>
            <label>
              Kata sandi baru
              <input name="newPassword" required type="password" minLength={8} autoComplete="new-password" />
            </label>
            <label>
              Konfirmasi kata sandi baru
              <input name="confirmPassword" required type="password" minLength={8} autoComplete="new-password" />
            </label>
            <button className="primary" disabled={changePasswordSubmitting} type="submit" style={{ width: '100%', marginTop: '16px' }}>
              {changePasswordSubmitting ? 'Memproses…' : 'Ubah Kata Sandi'}
            </button>
          </form>
        </div>
      </div>
    )}
    <header className="topbar">
      <div className="brand">
        <img className="brand-logo" src="/Aset/logo-sigesit-mark.png" alt="Logo SIGESIT Sadakeling" />
        <div><strong>SIGESIT SADAKELING {pkmName}</strong></div>
      </div>
      <div className="topbar-actions"><span className="topbar-copy">Copyright : Januari 2026</span><button className={`connection ${online ? 'online' : 'offline'}`} onClick={() => setOnline(!online)} type="button"><i />{online ? 'Terhubung' : 'Offline'}</button><button className="avatar" type="button" aria-label={`Profil ${displayName}`}>{initials || 'SZ'}</button>{session && <button className="logout" onClick={() => { void supabase?.auth.signOut() }} type="button">Keluar</button>}</div>
    </header>
    <section className="workspace">
      <aside className="sidebar">
        {pkmLogo && (
          <div style={{ padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
            <img src={pkmLogo} alt="Logo PKM" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}
        <p className="side-label">MENU UTAMA</p>
        <nav>
          <button className={view === 'beranda' ? 'active' : ''} onClick={() => setView('beranda')} type="button"><span>⌂</span> Beranda</button>
          {access.entry && <button className={view === 'entry' ? 'active' : ''} onClick={() => setView('entry')} type="button"><span>+</span> Entry Data</button>}
        </nav>
        {showPemeriksaan && <>
          <p className="side-label">PEMERIKSAAN</p>
          <nav>
            {access.uji_air && <button className={view === 'uji_air' ? 'active' : ''} onClick={() => { setView('uji_air'); void reloadWaterTests(); }} type="button"><span>💧</span> Uji Air</button>}
            {access.uji_udara && <button className={view === 'uji_udara' ? 'active' : ''} onClick={() => { setView('uji_udara'); void reloadAirTests(); }} type="button"><span>🌬️</span> Uji Udara</button>}
            {access.pangan && <button className={view === 'pangan' ? 'active' : ''} onClick={() => setView('pangan')} type="button"><span>🍱</span> Hasil Pangan/Makanan</button>}
          </nav>
        </>}
        {showDataMaster && <>
          <p className="side-label">DATA MASTER</p>
          <nav>
            {access.wilayah && <button className={view === 'wilayah' ? 'active' : ''} onClick={() => setView('wilayah')} type="button"><span>⌘</span> Wilayah</button>}
            {access.lokasi && <button className={view === 'lokasi' ? 'active' : ''} onClick={() => setView('lokasi')} type="button"><span>📍</span> Lokasi</button>}
            {access.group_tpp && <button className={view === 'group_tpp' ? 'active' : ''} onClick={() => setView('group_tpp')} type="button"><span>📋</span> Group/Jenis TPP</button>}
            {access.pengguna && <button className={view === 'pengguna' ? 'active' : ''} onClick={() => setView('pengguna')} type="button"><span>♙</span> Pengguna</button>}
          </nav>
        </>}
        {access.laporan && <>
          <p className="side-label">LAPORAN</p>
          <nav>
            <button className={view === 'laporan' ? 'active' : ''} onClick={() => setView('laporan')} type="button"><span>📊</span> Laporan Jentik</button>
            {access.laporan_dbd && <button className={view === 'laporan_dbd' ? 'active' : ''} onClick={() => setView('laporan_dbd')} type="button"><span>🦟</span> Laporan DBD</button>}
          </nav>
        </>}
        <p className="side-label">LAINNYA</p>
        <nav>
          <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')} type="button"><span>⚙</span> Pengaturan</button>
        </nav>
        {/* Modul Profil disembunyikan dari navigasi */}
      </aside>
      <section className="content">{view === 'entry' && access.entry ? <EntryPage profile={profile} kelurahan={kelurahan} rw={rw} rt={rt} /> : view === 'wilayah' && access.wilayah ? <WilayahPage kelurahan={kelurahan} rw={rw} rt={rt} setKelurahan={setKelurahan} setRw={setRw} setRt={setRt} /> : view === 'pengguna' && access.pengguna ? <PenggunaPage kelurahan={kelurahan} rw={rw} rt={rt} currentUserId={session?.user.id} /> : view === 'profile' ? <ProfilePage /> : view === 'lokasi' && access.lokasi ? <LokasiPage kelurahan={kelurahan} rw={rw} rt={rt} locations={locations} reloadLocations={reloadLocations} /> : view === 'uji_air' && access.uji_air ? <UjiAirPage profile={profile} locations={locations} kelurahan={kelurahan} waterTests={waterTests} setWaterTests={setWaterTests} /> : view === 'uji_udara' && access.uji_udara ? <UjiUdaraPage profile={profile} locations={locations} kelurahan={kelurahan} airTests={airTests} setAirTests={setAirTests} /> : view === 'pangan' && access.pangan ? <PanganPage profile={profile} kelurahan={kelurahan} rw={rw} rt={rt} foodInspections={foodInspections} setFoodInspections={setFoodInspections} /> : view === 'group_tpp' && access.group_tpp ? <GroupTppPage /> : view === 'laporan' && access.laporan ? <LaporanPage /> : view === 'laporan_dbd' && access.laporan_dbd ? <LaporanDbdPage /> : view === 'settings' ? <SettingsPage /> : <Dashboard view={view} setView={setView} access={access} profile={profile} pkmInfo={pkmInfo} kelurahan={kelurahan} locations={locations} />}</section>
    </section>
  </main>
}

function WilayahPage({ kelurahan, rw, rt, setKelurahan, setRw, setRt }: { kelurahan: Region[]; rw: Region[]; rt: Region[]; setKelurahan: (items: Region[]) => void; setRw: (items: Region[]) => void; setRt: (items: Region[]) => void }) {
  const [level, setLevel] = useState<RegionLevel>('kelurahan')
  const [editing, setEditing] = useState<Region | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedKelurahanId, setSelectedKelurahanId] = useState('')
  const [parentId, setParentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [filterRwId, setFilterRwId] = useState('')
  const items = (() => {
    if (level === 'kelurahan') return kelurahan
    if (level === 'rw') return filterKelurahanId ? rw.filter((item) => item.kelurahanId === filterKelurahanId) : rw
    // RT
    if (!filterKelurahanId) return rt
    const rwInKelurahan = rw.filter((item) => item.kelurahanId === filterKelurahanId)
    const rwIdSet = new Set(rwInKelurahan.map((item) => item.id))
    const rtInKelurahan = rt.filter((item) => item.rwId && rwIdSet.has(item.rwId))
    return filterRwId ? rtInKelurahan.filter((item) => item.rwId === filterRwId) : rtInKelurahan
  })()
  const parents = level === 'rw' ? kelurahan : rw.filter((item) => item.kelurahanId === selectedKelurahanId)

  useEffect(() => {
    // Reset filter RW kalau ganti kelurahan filter di submenu RT
    if (level === 'rt') setFilterRwId('')
  }, [filterKelurahanId, level])

  // Reload data when switching to this view
  useEffect(() => {
    async function reloadRegions() {
      if (supabaseConfigured && supabase) {
        setLoading(true)
        try {
          console.log('Reloading regions for WilayahPage...')
          const [kelurahanResult, rwResult, rtResult] = await Promise.all([
            supabase.from('kelurahan').select('id, name, code').order('name'),
            supabase.from('rw').select('id, number, kelurahan_id'),
            supabase.from('rt').select('id, number, rw_id'),
          ])
          
          let kelurahanData: Region[] = []
          
          if (!kelurahanResult.error && kelurahanResult.data) {
            kelurahanData = kelurahanResult.data.map((item) => ({ id: item.id, name: item.name, code: item.code }))
            setKelurahan(kelurahanData)
          }
          
          // Declare rwData in outer scope so it can be used in rtData.sort
          let rwData: Array<{ id: string; name: string; kelurahanId: string }> = []
          if (!rwResult.error && rwResult.data) {
            rwData = rwResult.data.map((item) => ({ id: item.id, name: item.number, kelurahanId: item.kelurahan_id }))
            rwData.sort((a, b) => {
              const kelurahanA = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === a.kelurahanId)?.name || ''
              const kelurahanB = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === b.kelurahanId)?.name || ''
              if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
              const numA = parseInt(a.name, 10) || 0
              const numB = parseInt(b.name, 10) || 0
              return numA - numB
            })
            setRw(rwData)
          }
          
          if (!rtResult.error && rtResult.data) {
            let rtData = rtResult.data.map((item) => ({ id: item.id, name: item.number, rwId: item.rw_id }))
            rtData.sort((a, b) => {
              const rwA = rwData.find((r) => r.id === a.rwId)
              const rwB = rwData.find((r) => r.id === b.rwId)
              const kelurahanA = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === rwA?.kelurahanId)?.name || ''
              const kelurahanB = kelurahanData.find((k: { id: string; name: string; code?: string }) => k.id === rwB?.kelurahanId)?.name || ''
              if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
              if (rwA?.name !== rwB?.name) {
                const rwNumA = parseInt(rwA?.name || '0', 10) || 0
                const rwNumB = parseInt(rwB?.name || '0', 10) || 0
                return rwNumA - rwNumB
              }
              const rtNumA = parseInt(a.name, 10) || 0
              const rtNumB = parseInt(b.name, 10) || 0
              return rtNumA - rtNumB
            })
            setRt(rtData)
          }
          
          console.log('Regions reloaded successfully')
        } catch (err) {
          console.error('Error reloading regions:', err)
        } finally {
          setLoading(false)
        }
      }
    }
    reloadRegions()
  }, [])

  function openForm(item?: Region) {
    setEditing(item ?? null)
    const kelurahanId = level === 'rt' ? rw.find((current) => current.id === item?.rwId)?.kelurahanId ?? kelurahan[0]?.id ?? '' : item?.kelurahanId ?? ''
    setSelectedKelurahanId(kelurahanId)
    setParentId(item?.kelurahanId ?? item?.rwId ?? (level === 'rw' ? kelurahan[0]?.id ?? '' : ''))
    setFormOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const code = String(data.get('code') ?? '').trim()
    if (!name || (level === 'rw' && !parentId) || (level === 'rt' && (!selectedKelurahanId || !parentId))) return
    let item: Region = { id: editing?.id ?? `${level}-${Date.now()}`, name, ...(level === 'kelurahan' ? { code } : level === 'rw' ? { kelurahanId: parentId } : { rwId: parentId }) }
    if (supabaseConfigured && supabase) {
      const table = level === 'kelurahan' ? 'kelurahan' : level
      const payload = level === 'kelurahan' ? { name, code } : level === 'rw' ? { number: name, kelurahan_id: parentId } : { number: name, rw_id: parentId }
      const result = editing ? await supabase.from(table).update(payload as never).eq('id', editing.id).select().single() : await supabase.from(table).insert(payload as never).select().single()
      if (result.error) {
        window.alert(`Data gagal disimpan: ${result.error.message}`)
        return
      }
      const savedItem = result.data as { id: string; name?: string; code?: string; number?: string; kelurahan_id?: string; rw_id?: string }
      item = { id: savedItem.id, name: savedItem.name ?? savedItem.number ?? name, code: savedItem.code, kelurahanId: savedItem.kelurahan_id, rwId: savedItem.rw_id }
    }
    if (level === 'kelurahan') {
      const updatedKelurahan = editing ? kelurahan.map((current) => current.id === item.id ? item : current) : [...kelurahan, item]
      setKelurahan(updatedKelurahan)
    }
    if (level === 'rw') {
      let updatedRw = editing ? rw.map((current) => current.id === item.id ? item : current) : [...rw, item]
      // Re-sort RW after adding/editing
      updatedRw.sort((a, b) => {
        const kelurahanA = kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === a.kelurahanId)?.name || ''
        const kelurahanB = kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === b.kelurahanId)?.name || ''
        if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
        const numA = parseInt(a.name, 10) || 0
        const numB = parseInt(b.name, 10) || 0
        return numA - numB
      })
      setRw(updatedRw)
    }
    if (level === 'rt') {
      let updatedRt = editing ? rt.map((current) => current.id === item.id ? item : current) : [...rt, item]
      // Re-sort RT after adding/editing
      updatedRt.sort((a, b) => {
        const rwA = rw.find((r) => r.id === a.rwId)
        const rwB = rw.find((r) => r.id === b.rwId)
        const kelurahanA = kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === rwA?.kelurahanId)?.name || ''
        const kelurahanB = kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === rwB?.kelurahanId)?.name || ''
        if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
        if (rwA?.name !== rwB?.name) {
          const rwNumA = parseInt(rwA?.name || '0', 10) || 0
          const rwNumB = parseInt(rwB?.name || '0', 10) || 0
          return rwNumA - rwNumB
        }
        const rtNumA = parseInt(a.name, 10) || 0
        const rtNumB = parseInt(b.name, 10) || 0
        return rtNumA - rtNumB
      })
      setRt(updatedRt)
    }
    setFormOpen(false)
  }

  async function remove(item: Region) {
    const childCount = level === 'kelurahan' ? rw.filter((child) => child.kelurahanId === item.id).length : level === 'rw' ? rt.filter((child) => child.rwId === item.id).length : 0
    if (childCount) {
      window.alert(`Data tidak dapat dihapus. Hapus terlebih dahulu ${childCount} data ${level === 'kelurahan' ? 'RW' : 'RT'} yang terpetakan.`)
      return
    }
    if (!window.confirm(`Hapus ${level} ${item.name}?`)) return
    if (supabaseConfigured && supabase) {
      const table = level === 'kelurahan' ? 'kelurahan' : level
      const result = await supabase.from(table).delete().eq('id', item.id)
      if (result.error) {
        window.alert(`Data gagal dihapus: ${result.error.message}`)
        return
      }
    }
    if (level === 'kelurahan') setKelurahan(kelurahan.filter((current) => current.id !== item.id))
    if (level === 'rw') setRw(rw.filter((current) => current.id !== item.id))
    if (level === 'rt') setRt(rt.filter((current) => current.id !== item.id))
  }

  const parentName = (item: Region) => parents.find((parent) => parent.id === (item.kelurahanId ?? item.rwId))?.name ?? '-'
  const rtLocation = (item: Region) => {
    const rwItem = rw.find((current) => current.id === item.rwId)
    const kelurahanItem = kelurahan.find((current) => current.id === rwItem?.kelurahanId)
    return `RW ${rwItem?.name ?? '-'} · Kelurahan: ${kelurahanItem?.name ?? '-'}`
  }

  function exportExcel() {
    if (items.length === 0) {
      window.alert('Tidak ada data wilayah untuk diexport.')
      return
    }
    const header = ['Nama Wilayah', 'Keterangan']
    const rows = items.map((item) => {
      const nama = level === 'rw' ? `RW ${item.name}` : level === 'rt' ? `RT ${item.name}` : item.name
      const ket = level === 'kelurahan' ? `Kode: ${item.code}` : level === 'rt' ? rtLocation(item) : `Kelurahan: ${parentName(item)}`
      return [nama, ket]
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({
      fileName: `wilayah_${level}_${today}.xlsx`,
      sheetName: `Wilayah ${level.toUpperCase()}`,
      header,
      rows,
    })
  }
  
  if (loading) {
    return <section className="master-page">
      <div className="page-heading">
        <div><p className="eyebrow">DATA MASTER</p><h1>Data Wilayah</h1><p>Kelola Kelurahan, RW, dan RT dengan hubungan wilayah yang terjaga.</p></div>
      </div>
      <div className="empty-state">
        <span>⌘</span>
        <h2>Memuat data wilayah...</h2>
      </div>
    </section>
  }
  
  return (
    <section className="master-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA MASTER</p>
          <h1>Data Wilayah</h1>
          <p>Kelola Kelurahan, RW, dan RT dengan hubungan wilayah yang terjaga.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="secondary" onClick={exportExcel} type="button">Export Excel</button>
          <button className="primary" onClick={() => openForm()} type="button">+ Tambah {level}</button>
        </div>
      </div>

      <div className="region-tabs">
        {(['kelurahan', 'rw', 'rt'] as RegionLevel[]).map((tab) => (
          <button
            className={level === tab ? 'active' : ''}
            key={tab}
            onClick={() => {
              setLevel(tab)
              setFormOpen(false)
              setEditing(null)
              setSelectedKelurahanId('')
              setParentId('')
              setFilterKelurahanId('')
              setFilterRwId('')
            }}
            type="button"
          >
            {tab.toUpperCase()} <span>{tab === 'kelurahan' ? kelurahan.length : tab === 'rw' ? rw.length : rt.length}</span>
          </button>
        ))}
      </div>

      {(level === 'rw' || level === 'rt') && (
        <div className="region-form" style={{ padding: '16px', marginBottom: '18px' }}>
          <div className="region-form-fields" style={{ marginTop: 0 }}>
            <label>
              Filter Kelurahan
              <select value={filterKelurahanId} onChange={(e) => setFilterKelurahanId(e.target.value)}>
                <option value="">Semua Kelurahan</option>
                {kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            {level === 'rt' && filterKelurahanId && (
              <label>
                Filter RW
                <select value={filterRwId} onChange={(e) => setFilterRwId(e.target.value)}>
                  <option value="">Semua RW</option>
                  {rw.filter((item) => item.kelurahanId === filterKelurahanId).map((item) => (
                    <option key={item.id} value={item.id}>RW {item.name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <form className="region-form" onSubmit={save}>
          <strong>{editing ? 'Edit' : 'Tambah'} {level}</strong>
          <div className="region-form-fields">
            <label>Nama {level}
              <input name="name" defaultValue={editing?.name} placeholder={level === 'kelurahan' ? 'Nama kelurahan' : 'Contoh: 05'} required />
            </label>
            {level === 'kelurahan' && (
              <label>Kode wilayah
                <input name="code" defaultValue={editing?.code} placeholder="Kode kelurahan" required />
              </label>
            )}
            {level === 'rw' && (
              <label>Kelurahan
                <select value={parentId} onChange={(event) => setParentId(event.target.value)} required>
                  <option value="">Pilih kelurahan</option>
                  {kelurahan.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
                </select>
              </label>
            )}
            {level === 'rt' && (
              <>
                <label>Kelurahan
                  <select value={selectedKelurahanId} onChange={(event) => { setSelectedKelurahanId(event.target.value); setParentId('') }} required>
                    <option value="">Pilih kelurahan</option>
                    {kelurahan.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}
                  </select>
                </label>
                <label>RW
                  <select value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={!selectedKelurahanId} required>
                    <option value="">{selectedKelurahanId ? 'Pilih RW' : 'Pilih kelurahan terlebih dahulu'}</option>
                    {parents.map((parent) => <option key={parent.id} value={parent.id}>RW {parent.name}</option>)}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="form-actions">
            <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
            <button className="primary" type="submit">Simpan</button>
          </div>
        </form>
      )}

      <div className="region-list">
        {items.length === 0 ? (
          <div className="empty-state">
            <span>⌘</span>
            <h2>Belum ada data</h2>
            <p>Tambahkan {level} untuk mulai membangun wilayah kerja.</p>
          </div>
        ) : (
          <div className="data-table-container">
          <table className="data-table pangan-table">
              <thead>
                <tr>
                  <th>Nama Wilayah</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{level === 'rw' ? `RW ${item.name}` : level === 'rt' ? `RT ${item.name}` : item.name}</strong></td>
                    <td><small>{level === 'kelurahan' ? `Kode: ${item.code}` : level === 'rt' ? rtLocation(item) : `Kelurahan: ${parentName(item)}`}</small></td>
                    <td>
                      <div className="row-actions">
                        <button className="edit-button btn-edit" onClick={() => openForm(item)} type="button">Edit</button>
                        <button className="delete-button btn-delete" onClick={() => remove(item)} type="button">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

// ===================== BERANDA / DASHBOARD INFORMASI (REAL-TIME) =====================
const DASH_REFRESH_MS = 60000

type DashboardAccess = Record<keyof ModuleAccess, boolean> & { laporan: boolean; laporan_dbd: boolean }

type DashEntryLite = { id: string; entryNumber: number; entryDate: string; kelurahanId: string; rwId: string }

type DashCardLite = { entryId: string; totalJiwa: number; jiwaMenetap: number; jamban: number }

type DashSummary = {
  entries: DashEntryLite[]
  cards: DashCardLite[]
  kk: number
  jiwa: number
  jiwaMenetap: number
  jamban: number
  water: WaterQualityTest[]
  air: AirQualityTest[]
  food: FoodInspectionResult[]
  users: number
  abj: AbjReport[]
  dbd: DbdReport[]
}

type DashBadge = { cls: 'ok' | 'warn' | 'bad' | 'neutral'; label: string }

type DashMonth = { start: number; end: number; label: string }

function dashEmptySummary(): DashSummary {
  return { entries: [], cards: [], kk: 0, jiwa: 0, jiwaMenetap: 0, jamban: 0, water: [], air: [], food: [], users: 0, abj: [], dbd: [] }
}

function dashNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function dashMean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, item) => sum + item, 0) / values.length
}

function dashDateMs(value?: string | null): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

// Batas awal & akhir tahun berjalan (1 Januari s.d 31 Desember tahun yang sama)
function dashStartYear(ms: number): number {
  const date = new Date(ms)
  return new Date(date.getFullYear(), 0, 1).getTime()
}

function dashEndYear(ms: number): number {
  const date = new Date(ms)
  return new Date(date.getFullYear() + 1, 0, 1).getTime()
}

function dashIsPositive(value: unknown): boolean {
  const text = String(value ?? '').trim().toLowerCase()
  return text === 'positif' || text === 'positive' || text === '1' || text === '+'
}

function dashInMonth(ms: number, month: DashMonth): boolean {
  return ms > 0 && ms >= month.start && ms < month.end
}

// Daftar bulan dari Januari tahun berjalan s.d bulan berjalan
function dashYearMonths(baseMs: number): DashMonth[] {
  const now = new Date(baseMs)
  const months: DashMonth[] = []
  for (let month = 0; month <= now.getMonth(); month++) {
    const start = new Date(now.getFullYear(), month, 1)
    const end = new Date(now.getFullYear(), month + 1, 1)
    months.push({
      start: start.getTime(),
      end: end.getTime(),
      label: start.toLocaleDateString('id-ID', { month: 'short' }),
    })
  }
  return months
}

function dashFormatTime(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function dashFormatDate(ms: number): string {
  if (!ms) return '-'
  return new Date(ms).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Dashboard({ view, setView, access, profile, pkmInfo, kelurahan, locations }: {
  view: View
  setView: (view: View) => void
  access: DashboardAccess
  profile: UserProfile | null
  pkmInfo: PKMInfo | null
  kelurahan: Region[]
  locations: Location[]
}) {
  const profileId = profile?.id ?? null
  const profileRole = profile?.role ?? null
  const [summary, setSummary] = useState<DashSummary | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loadErrors, setLoadErrors] = useState<string[]>([])
  // Waktu dihitung saat pengambilan data (bukan saat render) agar render tetap murni
  const [nowMs, setNowMs] = useState(0)
  const [greeting, setGreeting] = useState('Selamat pagi')

  // Ambil ringkasan semua modul secara paralel (Supabase + Google Sheet)
  const loadSummary = useCallback(async () => {
    setRefreshing(true)
    const failed: string[] = []
    const next = dashEmptySummary()
    const isKader = profileRole === 'kader'
    const jobs: Promise<void>[] = []
    const client = supabase

    if (supabaseConfigured && client) {
      const db = client

      // 1) Entry data (jumlah rumah, KK, jiwa, jamban)
      jobs.push((async () => {
        try {
          let query = db.from('entries').select('id, entry_number, entry_date, kelurahan_id, rw_id')
          if (isKader && profileId) query = query.eq('officer_id', profileId)
          const { data, error } = await query.order('entry_date', { ascending: false })
          if (error) throw error
          next.entries = (data ?? []).map((row: any) => ({
            id: String(row.id),
            entryNumber: Number(row.entry_number) || 0,
            entryDate: row.entry_date ?? '',
            kelurahanId: row.kelurahan_id ?? '',
            rwId: row.rw_id ?? '',
          }))
          if (next.entries.length > 0) {
            const { data: cards, error: cardsError } = await db
              .from('family_cards')
              .select('entry_id, total_jiwa, jiwa_menetap, jamban_count')
              .in('entry_id', next.entries.map((entry) => entry.id))
            if (cardsError) throw cardsError
            next.cards = (cards ?? []).map((row: any) => ({
              entryId: String(row.entry_id ?? ''),
              totalJiwa: Number(row.total_jiwa) || 0,
              jiwaMenetap: Number(row.jiwa_menetap) || 0,
              jamban: Number(row.jamban_count) || 0,
            }))
          }
        } catch {
          failed.push('Entry Data')
        }
      })())

      // 2) Uji kualitas air
      jobs.push((async () => {
        try {
          let query = db.from('water_quality_tests').select('*')
          if (isKader && profileId) query = query.eq('officer_id', profileId)
          const { data, error } = await query.order('test_date', { ascending: false })
          if (error) throw error
          next.water = (data ?? []).map((row: any) => mapWaterQualityTestRow(row))
        } catch {
          failed.push('Uji Air')
        }
      })())

      // 3) Uji kualitas udara
      jobs.push((async () => {
        try {
          let query = db.from('air_quality_tests').select('*')
          if (isKader && profileId) query = query.eq('officer_id', profileId)
          const { data, error } = await query.order('test_date', { ascending: false })
          if (error) throw error
          next.air = (data ?? []).map((row: any) => mapAirQualityTestRow(row))
        } catch {
          failed.push('Uji Udara')
        }
      })())

      // 4) Hasil pemeriksaan pangan
      jobs.push((async () => {
        try {
          let query = db.from('food_inspection_results').select('*')
          if (isKader && profileId) query = query.eq('officer_id', profileId)
          const { data, error } = await query.order('entry_date', { ascending: false })
          if (error) throw error
          next.food = (data ?? []).map((row: any) => mapFoodInspectionRow(row))
        } catch {
          failed.push('Hasil Pangan')
        }
      })())

      // 5) Jumlah pengguna (kader & relawan)
      if (!isKader) {
        jobs.push((async () => {
          try {
            const { count, error } = await db.from('profiles').select('id', { count: 'exact', head: true })
            if (error) throw error
            next.users = count ?? 0
          } catch {
            failed.push('Pengguna')
          }
        })())
      }
    }

    // 6) Laporan jentik (ABJ) & 7) Laporan DBD dari Google Sheet
    if (!isKader) {
      jobs.push((async () => {
        try {
          const response = await fetch(ABJ_SHEET_CSV_URL)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          next.abj = parseAbjRows(parseCsv(await response.text()))
        } catch {
          failed.push('Laporan Jentik')
        }
      })())
      jobs.push((async () => {
        try {
          const response = await fetch(DBD_SHEET_CSV_URL)
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          next.dbd = parseDbdRows(parseCsv(await response.text()))
        } catch {
          failed.push('Laporan DBD')
        }
      })())
    }

    await Promise.all(jobs)
    const loadedAt = Date.now()
    const loadedHour = new Date(loadedAt).getHours()
    setSummary(next)
    setLastUpdated(new Date(loadedAt))
    setNowMs(loadedAt)
    setGreeting(loadedHour < 10 ? 'Selamat pagi' : loadedHour < 15 ? 'Selamat siang' : loadedHour < 18 ? 'Selamat sore' : 'Selamat malam')
    setLoadErrors(failed)
    setRefreshing(false)
  }, [profileId, profileRole])

  // Muat saat pertama tampil, refresh tiap 60 detik dan saat jendela kembali fokus
  useEffect(() => {
    void loadSummary()
    const timer = window.setInterval(() => { void loadSummary() }, DASH_REFRESH_MS)
    const handleFocus = () => { void loadSummary() }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadSummary])

  // ===================== Perhitungan ringkasan & analisa =====================
  // Rentang waktu beranda: tahun berjalan (1 Januari s.d hari ini)
  const raw = summary ?? dashEmptySummary()
  const yearStart = dashStartYear(nowMs)
  const yearEnd = dashEndYear(nowMs)
  const inYear = (ms: number) => ms > 0 && ms >= yearStart && ms < yearEnd
  const data: DashSummary = {
    entries: raw.entries.filter((item) => inYear(dashDateMs(item.entryDate))),
    water: raw.water.filter((item) => inYear(dashDateMs(item.testDate))),
    air: raw.air.filter((item) => inYear(dashDateMs(item.testDate))),
    food: raw.food.filter((item) => inYear(dashDateMs(item.entryDate))),
    abj: raw.abj.filter((item) => inYear(item.dateMs)),
    dbd: raw.dbd.filter((item) => inYear(item.dateMs)),
    cards: raw.cards,
    kk: 0,
    jiwa: 0,
    jiwaMenetap: 0,
    jamban: 0,
    users: raw.users,
  }
  const yearEntryIds = new Set(data.entries.map((item) => item.id))
  for (const card of raw.cards) {
    if (!yearEntryIds.has(card.entryId)) continue
    data.kk += 1
    data.jiwa += card.totalJiwa
    data.jiwaMenetap += card.jiwaMenetap
    data.jamban += card.jamban
  }

  // Label rentang waktu tahun berjalan, contoh: "Jan–Sep 2026" dan "01 Jan 2026 – 23 Sep 2026"
  const yearLabel = `${new Date(yearStart).toLocaleDateString('id-ID', { month: 'short' })}–${new Date(nowMs).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}`
  const periodLabel = `${dashFormatDate(yearStart)} – ${dashFormatDate(nowMs)}`

  const entryTotal = data.entries.length
  const waterTotal = data.water.length
  const airTotal = data.air.length
  const foodTotal = data.food.length
  const abjTotal = data.abj.length
  const dbdTotal = data.dbd.length

  // --- Analisa kualitas air: pH 6,5-8,5, kekeruhan <=5 NTU, TDS <=1000, bebas E.coli ---
  const phList: number[] = []
  let waterChecked = 0
  let waterOk = 0
  for (const item of data.water) {
    const checks: boolean[] = []
    const ph = dashNum(item.phValue)
    if (ph !== null) {
      phList.push(ph)
      checks.push(ph >= 6.5 && ph <= 8.5)
    }
    const turbidity = dashNum(item.turbidityValue)
    if (turbidity !== null) checks.push(turbidity <= 5)
    const tds = dashNum(item.tdsValue)
    if (tds !== null) checks.push(tds <= 1000)
    if (item.eColiValue !== undefined && item.eColiValue !== null && String(item.eColiValue) !== '') {
      checks.push(!dashIsPositive(item.eColiValue))
    }
    if (checks.length > 0) {
      waterChecked += 1
      if (checks.every(Boolean)) waterOk += 1
    }
  }
  const avgPh = dashMean(phList)
  const waterPct = waterChecked > 0 ? Math.round((waterOk / waterChecked) * 100) : null
  const waterBadge: DashBadge = waterPct === null
    ? { cls: 'neutral', label: 'BELUM ADA DATA' }
    : waterPct >= 90
      ? { cls: 'ok', label: 'LAYAK' }
      : waterPct >= 70
        ? { cls: 'warn', label: 'PERLU EVALUASI' }
        : { cls: 'bad', label: 'TIDAK LAYAK' }

  // --- Analisa kualitas udara: PM2.5, PM10, kebisingan dibanding ambang acuan ---
  const pm25List: number[] = []
  const pm10List: number[] = []
  const noiseList: number[] = []
  for (const item of data.air) {
    for (const value of [item.pm25_1, item.pm25_2, item.pm25_3]) {
      const parsed = dashNum(value)
      if (parsed !== null) pm25List.push(parsed)
    }
    for (const value of [item.pm10_1, item.pm10_2, item.pm10_3]) {
      const parsed = dashNum(value)
      if (parsed !== null) pm10List.push(parsed)
    }
    for (const value of [item.noise1, item.noise2, item.noise3]) {
      const parsed = dashNum(value)
      if (parsed !== null) noiseList.push(parsed)
    }
  }
  const avgPm25 = dashMean(pm25List)
  const avgPm10 = dashMean(pm10List)
  const avgNoise = dashMean(noiseList)
  const airSampleCount = pm25List.length + pm10List.length + noiseList.length
  const airOver = pm25List.filter((value) => value > 55).length
    + pm10List.filter((value) => value > 80).length
    + noiseList.filter((value) => value > 55).length
  const airWithin = (avgPm25 === null || avgPm25 <= 55)
    && (avgPm10 === null || avgPm10 <= 80)
    && (avgNoise === null || avgNoise <= 55)
  const airBadge: DashBadge = airSampleCount === 0
    ? { cls: 'neutral', label: 'BELUM ADA DATA' }
    : airWithin
      ? { cls: 'ok', label: 'BAIK' }
      : { cls: 'warn', label: 'PERLU PERHATIAN' }

  // --- Analisa pangan: sampel terindikasi bahan berbahaya ---
  const foodParams = ['boraks', 'formalin', 'rodaminB', 'metanilYellow', 'eColi'] as const
  const foodParamLabels: Record<(typeof foodParams)[number], string> = {
    boraks: 'Boraks',
    formalin: 'Formalin',
    rodaminB: 'Rhodamin B',
    metanilYellow: 'Metanil Yellow',
    eColi: 'E-coli',
  }
  const foodPositive: Record<(typeof foodParams)[number], number> = { boraks: 0, formalin: 0, rodaminB: 0, metanilYellow: 0, eColi: 0 }
  let foodSamples = 0
  let foodSamplesPositive = 0
  for (const inspection of data.food) {
    for (const sample of inspection.samples) {
      foodSamples += 1
      let hasPositive = false
      for (const param of foodParams) {
        if (dashIsPositive(sample[param])) {
          foodPositive[param] += 1
          hasPositive = true
        }
      }
      if (hasPositive) foodSamplesPositive += 1
    }
  }
  const foodLulus = data.food.filter((item) => item.overallStatus === 'Lulus').length
  const foodSafePct = foodSamples > 0 ? Math.round(((foodSamples - foodSamplesPositive) / foodSamples) * 100) : null
  const foodFindings = foodParams
    .filter((param) => foodPositive[param] > 0)
    .map((param) => `${foodParamLabels[param]} ${foodPositive[param]}`)
    .join(' · ')
  const foodBadge: DashBadge = foodSamples === 0
    ? { cls: 'neutral', label: 'BELUM ADA DATA' }
    : foodSamplesPositive === 0
      ? { cls: 'ok', label: 'SEMUA AMAN' }
      : { cls: 'bad', label: 'ADA TEMUAN' }

  // --- Analisa jentik: ABJ (target nasional minimal 80%) ---
  const abjDiperiksa = data.abj.reduce((sum, item) => sum + item.diperiksa, 0)
  const abjPositif = data.abj.reduce((sum, item) => sum + item.positif, 0)
  const abjNegatif = data.abj.reduce((sum, item) => sum + item.negatif, 0)
  const abjPct = abjDiperiksa > 0 ? (abjNegatif / abjDiperiksa) * 100 : null
  const abjBadge: DashBadge = abjPct === null
    ? { cls: 'neutral', label: 'BELUM ADA DATA' }
    : abjPct >= 80
      ? { cls: 'ok', label: 'TARGET TERCAPAI' }
      : abjPct >= 60
        ? { cls: 'warn', label: 'PERLU PERHATIAN' }
        : { cls: 'bad', label: 'KRITIS' }

  // --- Analisa DBD: kasus, kesembuhan, CFR ---
  const dbdSembuh = data.dbd.filter((item) => item.kondisi.toLowerCase().includes('sembuh')).length
  const dbdMeninggal = data.dbd.filter((item) => item.kondisi.toLowerCase().includes('meninggal')).length
  const dbdCfr = dbdTotal > 0 ? (dbdMeninggal / dbdTotal) * 100 : null
  const dbdBadge: DashBadge = dbdTotal === 0
    ? { cls: 'neutral', label: 'BELUM ADA KASUS' }
    : { cls: 'warn', label: `${dbdTotal} KASUS TAHUN INI` }

  // --- Tren tahun berjalan (Januari s.d bulan berjalan) ---
  const months = dashYearMonths(nowMs)
  const activityByMonth = months.map((month) =>
    data.entries.filter((item) => dashInMonth(dashDateMs(item.entryDate), month)).length
    + data.water.filter((item) => dashInMonth(dashDateMs(item.testDate), month)).length
    + data.air.filter((item) => dashInMonth(dashDateMs(item.testDate), month)).length
    + data.food.filter((item) => dashInMonth(dashDateMs(item.entryDate), month)).length,
  )
  const jentikByMonth = months.map((month) =>
    data.abj.filter((item) => dashInMonth(item.dateMs, month)).reduce((sum, item) => sum + item.positif, 0),
  )
  const dbdByMonth = months.map((month) => data.dbd.filter((item) => dashInMonth(item.dateMs, month)).length)
  const maxActivity = Math.max(1, ...activityByMonth)
  const maxCases = Math.max(1, ...jentikByMonth, ...dbdByMonth)

  // --- Helper nama wilayah & lokasi ---
  const kelNameById = (id?: string) => (id ? kelurahan.find((region) => region.id === id)?.name : undefined)
  const locationKelName = (id?: string) => {
    const location = locations.find((item) => item.id === id)
    return location?.kelurahanId ? kelNameById(location.kelurahanId) : undefined
  }

  // --- Sebaran aktivitas per kelurahan (top 5) ---
  const kelCount = new Map<string, number>()
  const countKel = (name?: string) => {
    const key = String(name ?? '').trim().toUpperCase()
    if (!key) return
    kelCount.set(key, (kelCount.get(key) ?? 0) + 1)
  }
  data.entries.forEach((item) => countKel(kelNameById(item.kelurahanId)))
  data.food.forEach((item) => countKel(kelNameById(item.kelurahanId)))
  data.water.forEach((item) => countKel(locationKelName(item.locationId)))
  data.air.forEach((item) => countKel(locationKelName(item.locationId)))
  if (access.laporan) data.abj.forEach((item) => countKel(item.kelurahan))
  if (access.laporan_dbd) data.dbd.forEach((item) => countKel(item.kelurahan))
  const topKel = Array.from(kelCount, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxKel = topKel.length > 0 ? topKel[0].count : 1
  // Label sebaran mengikuti jumlah kelurahan yang benar-benar punya data (maks. 5 ditampilkan)
  const distSubtitle = kelCount.size === 0
    ? 'Belum ada aktivitas per kelurahan.'
    : kelCount.size > topKel.length
      ? `${topKel.length} dari ${kelCount.size} kelurahan dengan aktivitas pendataan & pelaporan terbanyak`
      : `${kelCount.size} kelurahan dengan aktivitas pendataan & pelaporan terbanyak`

  // --- Sapaan & info umum ---
  const pkmName = pkmInfo?.namaPkm || 'PKM Padasuka'
  const firstName = (profile?.fullName || 'Syifa').split(' ')[0]

  if (view !== 'beranda') return <section className="master-page"><div className="page-heading"><div><p className="eyebrow">DATA MASTER</p><h1>{view === 'wilayah' ? 'Data Wilayah' : view === 'pengguna' ? 'Pengguna Kader & Relawan' : view === 'lokasi' ? 'Data Lokasi' : view === 'uji_air' ? 'Uji Kualitas Air' : view === 'uji_udara' ? 'Uji Kualitas Udara' : view === 'pangan' ? 'Hasil Pemeriksaan Pangan/Makanan' : 'Entry Data'}</h1><p>Kelola data yang digunakan oleh seluruh petugas lapangan.</p></div></div></section>

  return <>
    <div className="page-heading dashboard-heading">
      <div>
        <p className="eyebrow">DASHBOARD INFORMASI</p>
        <h1>{greeting}, {firstName}.</h1>
        <p>Ringkasan real-time wilayah kerja {pkmName} — periode {periodLabel}. Entry, Uji Air, Uji Udara, Pangan, Jentik, dan DBD dalam satu layar.</p>
      </div>
      <div className="dash-toolbar">
        <button className="secondary" onClick={() => void loadSummary()} disabled={refreshing} type="button">{refreshing ? '⟳ Memperbarui…' : '⟳ Muat Ulang'}</button>
      </div>
    </div>

    {loadErrors.length > 0 && (
      <div className="error-message">Sebagian sumber data belum bisa dimuat: {loadErrors.join(', ')}. Tekan “⟳ Muat Ulang” untuk mencoba lagi.</div>
    )}

    {summary === null ? (
      <div className="empty-state"><span>📊</span><h2>Memuat ringkasan data…</h2><p>Mengambil data terbaru dari Supabase dan Google Sheet.</p></div>
    ) : <>
      {/* Status pembaruan */}
      <div className="status-banner">
        <div className="status-item">
          <span className={`status-dot ${lastUpdated ? 'synced' : 'pending'}`} />
          <span>{lastUpdated ? `Data diperbarui ${dashFormatTime(lastUpdated)} WIB` : 'Memuat data…'}</span>
        </div>
        <div className="status-item">
          <span className="status-dot synced" />
          <span>Refresh otomatis tiap 60 detik</span>
        </div>
        <div className="status-item">
          <span className={`status-dot ${loadErrors.length > 0 ? 'pending' : 'synced'}`} />
          <span>{loadErrors.length > 0 ? `${loadErrors.length} sumber data bermasalah` : 'Semua sumber data tersinkron'}</span>
        </div>
        <div className="status-item">
          <span className="status-dot synced" />
          <span>Periode {periodLabel}</span>
        </div>
      </div>

      {/* Grid statistik utama */}
      <div className="stat-grid">
        {access.entry && <article className="stat-card clickable" onClick={() => setView('entry')}>
          <span className="stat-icon gold">⌂</span>
          <div>
            <p>Rumah Terdata</p>
            <strong>{entryTotal}</strong>
            <small>Tahun berjalan · {yearLabel}</small>
          </div>
        </article>}
        {access.entry && <article className="stat-card clickable" onClick={() => setView('entry')}>
          <span className="stat-icon teal">👥</span>
          <div>
            <p>Populasi Terdata</p>
            <strong>{data.jiwa}</strong>
            <small>{data.kk} KK · {data.jiwaMenetap} menetap · {data.jamban} jamban</small>
          </div>
        </article>}
        {access.uji_air && <article className="stat-card clickable" onClick={() => setView('uji_air')}>
          <span className="stat-icon cyan">💧</span>
          <div>
            <p>Uji Kualitas Air</p>
            <strong>{waterTotal}</strong>
            <small>Tahun berjalan · {yearLabel}</small>
          </div>
        </article>}
        {access.uji_udara && <article className="stat-card clickable" onClick={() => setView('uji_udara')}>
          <span className="stat-icon purple">🌬️</span>
          <div>
            <p>Uji Kualitas Udara</p>
            <strong>{airTotal}</strong>
            <small>Tahun berjalan · {yearLabel}</small>
          </div>
        </article>}
        {access.pangan && <article className="stat-card clickable" onClick={() => setView('pangan')}>
          <span className="stat-icon green">🍱</span>
          <div>
            <p>Hasil Pangan/Makanan</p>
            <strong>{foodTotal}</strong>
            <small>Tahun berjalan · {yearLabel}</small>
          </div>
        </article>}
        {access.lokasi && <article className="stat-card clickable" onClick={() => setView('lokasi')}>
          <span className="stat-icon blue">📍</span>
          <div>
            <p>Lokasi Terdaftar</p>
            <strong>{locations.length}</strong>
            <small>Titik pengamatan aktif</small>
          </div>
        </article>}
        {access.pengguna && <article className="stat-card clickable" onClick={() => setView('pengguna')}>
          <span className="stat-icon coral">👥</span>
          <div>
            <p>Kader & Relawan</p>
            <strong>{data.users}</strong>
            <small>Petugas terdaftar</small>
          </div>
        </article>}
        {access.laporan && <article className="stat-card clickable" onClick={() => setView('laporan')}>
          <span className="stat-icon gold">📊</span>
          <div>
            <p>Laporan Jentik</p>
            <strong>{abjTotal}</strong>
            <small>Tahun berjalan · {yearLabel}</small>
          </div>
        </article>}
        {access.laporan_dbd && <article className="stat-card clickable" onClick={() => setView('laporan_dbd')}>
          <span className="stat-icon coral">🦟</span>
          <div>
            <p>Laporan DBD</p>
            <strong>{dbdTotal}</strong>
            <small>Tahun berjalan · {yearLabel}</small>
          </div>
        </article>}
      </div>

      {/* Analisa & informasi */}
      <section className="section-head">
        <div>
          <h2>Analisa & Informasi</h2>
          <p>Indikator kesehatan lingkungan dan penyakit, dihitung otomatis dari seluruh modul</p>
        </div>
      </section>

      <div className="dash-grid">
        {access.uji_air && <article className="insight-card">
          <header>
            <span className="insight-icon">💧</span>
            <h3>Kualitas Air</h3>
            <em className={`badge ${waterBadge.cls}`}>{waterBadge.label}</em>
          </header>
          <strong className="insight-value">{waterPct === null ? '–' : `${waterPct}%`}</strong>
          <p className="insight-hint">Sampel memenuhi standar (pH 6,5–8,5 · kekeruhan ≤ 5 · TDS ≤ 1000 · bebas E. coli)</p>
          <ul className="insight-list">
            <li><span>pH rata-rata</span><b>{avgPh === null ? '-' : avgPh.toFixed(1)}</b></li>
            <li><span>Sampel diperiksa</span><b>{waterChecked} dari {waterTotal}</b></li>
            <li><span>Periode data</span><b>{yearLabel}</b></li>
          </ul>
        </article>}

        {access.uji_udara && <article className="insight-card">
          <header>
            <span className="insight-icon">🌬️</span>
            <h3>Kualitas Udara</h3>
            <em className={`badge ${airBadge.cls}`}>{airBadge.label}</em>
          </header>
          <strong className="insight-value">{avgPm25 === null ? '–' : `${avgPm25.toFixed(1)}`}<small className="insight-unit"> µg/m³ PM2.5</small></strong>
          <p className="insight-hint">Ambang acuan: PM2.5 55 · PM10 80 µg/m³ · kebisingan 55 dB</p>
          <ul className="insight-list">
            <li><span>PM10 rata-rata</span><b>{avgPm10 === null ? '-' : `${avgPm10.toFixed(1)} µg/m³`}</b></li>
            <li><span>Kebisingan rata-rata</span><b>{avgNoise === null ? '-' : `${avgNoise.toFixed(1)} dB`}</b></li>
            <li><span>Melebihi ambang</span><b>{airOver} dari {airSampleCount} sampel</b></li>
            <li><span>Periode data</span><b>{yearLabel}</b></li>
          </ul>
        </article>}

        {access.pangan && <article className="insight-card">
          <header>
            <span className="insight-icon">🍱</span>
            <h3>Keamanan Pangan</h3>
            <em className={`badge ${foodBadge.cls}`}>{foodBadge.label}</em>
          </header>
          <strong className="insight-value">{foodSafePct === null ? '–' : `${foodSafePct}%`}</strong>
          <p className="insight-hint">{foodFindings ? `Temuan: ${foodFindings}` : 'Belum ada temuan bahan berbahaya pada sampel'}</p>
          <ul className="insight-list">
            <li><span>Sampel diperiksa</span><b>{foodSamples}</b></li>
            <li><span>Terindikasi zat berbahaya</span><b>{foodSamplesPositive}</b></li>
            <li><span>Pemeriksaan lulus</span><b>{foodLulus} dari {foodTotal}</b></li>
            <li><span>Periode data</span><b>{yearLabel}</b></li>
          </ul>
        </article>}

        {access.laporan && <article className="insight-card">
          <header>
            <span className="insight-icon">🦟</span>
            <h3>Angka Bebas Jentik</h3>
            <em className={`badge ${abjBadge.cls}`}>{abjBadge.label}</em>
          </header>
          <strong className="insight-value">{abjPct === null ? '–' : `${abjPct.toFixed(1)}%`}</strong>
          <p className="insight-hint">Target minimal 80% rumah negatif jentik</p>
          <ul className="insight-list">
            <li><span>Rumah diperiksa</span><b>{abjDiperiksa}</b></li>
            <li><span>Positif jentik</span><b>{abjPositif}</b></li>
            <li><span>Periode data</span><b>{yearLabel}</b></li>
          </ul>
        </article>}

        {access.laporan_dbd && <article className="insight-card">
          <header>
            <span className="insight-icon">🩺</span>
            <h3>Kasus DBD</h3>
            <em className={`badge ${dbdBadge.cls}`}>{dbdBadge.label}</em>
          </header>
          <strong className="insight-value">{dbdTotal}<small className="insight-unit"> kasus</small></strong>
          <p className="insight-hint">CFR {dbdCfr === null ? '-' : `${dbdCfr.toFixed(1)}%`} · rasio kematian terhadap total kasus</p>
          <ul className="insight-list">
            <li><span>Sembuh</span><b>{dbdSembuh}</b></li>
            <li><span>Meninggal</span><b>{dbdMeninggal}</b></li>
            <li><span>Periode data</span><b>{yearLabel}</b></li>
          </ul>
        </article>}

        {access.entry && <article className="insight-card">
          <header>
            <span className="insight-icon">🏠</span>
            <h3>Cakupan Pendataan</h3>
            <em className={`badge ${entryTotal > 0 ? 'ok' : 'neutral'}`}>{entryTotal > 0 ? 'AKTIF TAHUN INI' : 'BELUM ADA UPDATE'}</em>
          </header>
          <strong className="insight-value">{entryTotal}<small className="insight-unit"> rumah</small></strong>
          <p className="insight-hint">{data.jamban} jamban terdata — indikator penting pencegahan jentik & DBD</p>
          <ul className="insight-list">
            <li><span>Kartu keluarga</span><b>{data.kk} KK</b></li>
            <li><span>Jiwa terdata</span><b>{data.jiwa} ({data.jiwaMenetap} menetap)</b></li>
            <li><span>Periode data</span><b>{yearLabel}</b></li>
          </ul>
        </article>}
      </div>

      {/* Tren */}
      <section className="section-head">
        <div>
          <h2>Tren Tahun Berjalan</h2>
          <p>Pergerakan aktivitas pemeriksaan dan pelaporan per bulan · {periodLabel}</p>
        </div>
      </section>

      <div className="dash-grid two">
        <article className="chart-card">
          <header>
            <h3>Aktivitas Pemeriksaan</h3>
            <span className="chart-total">{activityByMonth.reduce((sum, item) => sum + item, 0)} kegiatan</span>
          </header>
          <p className="chart-hint">Gabungan entry rumah, uji air, uji udara, dan pemeriksaan pangan</p>
          <div className="bar-chart">
            {months.map((month, index) => (
              <div className="bar-col" key={`activity-${month.label}-${index}`} title={`${month.label}: ${activityByMonth[index]} kegiatan`}>
                <span className="bar-num">{activityByMonth[index]}</span>
                <div className="bar-track"><div className="bar" style={{ height: `${Math.round((activityByMonth[index] / maxActivity) * 100)}%` }} /></div>
                <span className="bar-label">{month.label}</span>
              </div>
            ))}
          </div>
        </article>

        {access.laporan && <article className="chart-card">
          <header>
            <h3>Jentik & DBD</h3>
            <span className="chart-legend"><i className="legend-dot jentik" />Positif jentik <i className="legend-dot dbd" />Kasus DBD</span>
          </header>
          <p className="chart-hint">Perbandingan temuan positif jentik dan kasus DBD tiap bulan</p>
          <div className="bar-chart">
            {months.map((month, index) => (
              <div className="bar-col" key={`cases-${month.label}-${index}`} title={`${month.label}: ${jentikByMonth[index]} positif jentik, ${dbdByMonth[index]} kasus DBD`}>
                <span className="bar-num">{jentikByMonth[index] + dbdByMonth[index]}</span>
                <div className="bar-track">
                  <div className="bar jentik" style={{ height: `${Math.round((jentikByMonth[index] / maxCases) * 100)}%` }} />
                  <div className="bar dbd" style={{ height: `${Math.round((dbdByMonth[index] / maxCases) * 100)}%` }} />
                </div>
                <span className="bar-label">{month.label}</span>
              </div>
            ))}
          </div>
        </article>}
      </div>

      {/* Sebaran wilayah */}
      <section className="section-head">
        <div>
          <h2>Sebaran per Kelurahan</h2>
          <p>{distSubtitle}</p>
        </div>
        {access.wilayah && <button className="text-button" onClick={() => setView('wilayah')} type="button">Kelola wilayah</button>}
      </section>

      <div className="dist-card">
        {topKel.length === 0 ? (
          <p className="dist-empty">Belum ada data dengan informasi kelurahan.</p>
        ) : topKel.map((item) => (
          <div className="dist-row" key={item.name}>
            <span className="dist-name">{item.name}</span>
            <div className="dist-bar"><i style={{ width: `${Math.round((item.count / maxKel) * 100)}%` }} /></div>
            <b className="dist-value">{item.count}</b>
          </div>
        ))}
      </div>
    </>}
  </>
}

// === Import Entry Data via Excel (mengikuti rule form manual) ===
const IMPORT_BASE_HEADERS = ['Tanggal (YYYY-MM-DD)', 'Kelurahan', 'RW', 'RT', 'Kelompok Entry', 'No KK (16 digit)', 'NIK Kepala Keluarga', 'Nama Kepala Keluarga', 'Alamat', 'Total Jiwa', 'Jiwa Menetap', 'Jumlah Jamban'] as const

type ImportAnswer = { pillar: string; code: string; answer: boolean }
type ImportCard = { rowNum: number; kkNumber: string; nik: string; name: string; address: string; totalJiwa: number; jiwaMenetap: number; jambanCount: number; answers: ImportAnswer[] }
type ImportGroup = { key: string; entryDate: string; kelurahanId: string; rwId: string; rtId: string; cards: ImportCard[]; warnings: string[] }

// Pilar single-choice di form (hanya boleh 1 jawaban Ya, sisanya dianggap Tidak)
const IMPORT_SINGLE_CHOICE_PILLARS = ['jamban', 'sumber_air']

function importQuestionPillar(): Record<string, string> {
  const map: Record<string, string> = {}
  Object.entries(questionnaireData).forEach(([pillar, questions]) => {
    questions.forEach((q) => { map[q.code] = pillar })
  })
  return map
}

function parseImportBool(raw: unknown): boolean | null | 'invalid' {
  if (raw === null || raw === undefined) return null
  const text = String(raw).trim().toLowerCase()
  if (text === '') return null
  if (['ya', 'y', 'yes', '1', 'true', 'benar'].includes(text)) return true
  if (['tidak', 't', 'no', '0', 'false', 'salah'].includes(text)) return false
  return 'invalid'
}

function parseImportDate(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const text = String(raw ?? '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const dt = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (dt.getFullYear() !== Number(match[1]) || dt.getMonth() !== Number(match[2]) - 1 || dt.getDate() !== Number(match[3])) return null
  return text
}

function parseImportInt(raw: unknown): number | null {
  const text = String(raw ?? '').trim()
  if (text === '') return 0
  if (!/^\d+$/.test(text)) return null
  const value = Number(text)
  return Number.isSafeInteger(value) ? value : null
}

// Nomor RW/RT di Excel rawan kehilangan nol depan: sel General berisi "01"
// disimpan Excel sebagai angka 1 dan terbaca sebagai "1", sementara database
// menyimpan "01". Samakan dengan perbandingan eksak dulu, lalu fallback
// tanpa-nol-depan agar "1" tetap cocok dengan "01".
function normalizeRegionNumber(raw: string): string {
  const stripped = raw.trim().replace(/^0+/, '')
  return stripped === '' ? '0' : stripped
}

function downloadEntryImportTemplate() {
  const codeToPillar = importQuestionPillar()
  const codes = Object.keys(codeToPillar)
  const dataHeader = [...IMPORT_BASE_HEADERS, ...codes]
  const dataWs = XLSX.utils.aoa_to_sheet([dataHeader])
  dataWs['!cols'] = [...IMPORT_BASE_HEADERS.map(() => ({ wch: 22 })), ...codes.map(() => ({ wch: 24 }))]
  const exampleA = ['2026-09-25', 'Padasuka', '05', '01', '1', '3273010101010001', '3273010101010001', 'Contoh Kepala Keluarga 1', 'Jl. Contoh No. 1', 4, 4, 1]
  const exampleB = ['2026-09-25', 'Padasuka', '05', '01', '1', '3273010101010002', '3273010101010002', 'Contoh Kepala Keluarga 2', 'Jl. Contoh No. 2', 3, 3, 1]
  const exampleWs = XLSX.utils.aoa_to_sheet([dataHeader, exampleA, exampleB])
  exampleWs['!cols'] = dataWs['!cols']
  const panduanHeader = ['Kode Kolom', 'Pilar', 'Pertanyaan', 'Cara Isi']
  const panduanRows: (string | number)[][] = [
    ['Tanggal (YYYY-MM-DD)', '-', '-', 'Wajib. Format YYYY-MM-DD, mis. 2026-09-25'],
    ['Kelurahan', '-', '-', 'Wajib. Nama persis seperti di menu Wilayah'],
    ['RW / RT', '-', '-', 'Wajib. Nomor persis seperti di menu Wilayah (format sel: Teks, agar "01" tidak berubah menjadi "1")'],
    ['Kelompok Entry', '-', '-', 'Opsional. Samakan angkanya bila beberapa KK adalah 1 kunjungan/entry. Kosongkan bila tiap baris adalah entry sendiri'],
    ['No KK (16 digit)', '-', '-', 'Wajib. Angka, maksimal 16 digit'],
    ['NIK Kepala Keluarga', '-', '-', 'Opsional. Angka, maksimal 16 digit'],
    ['Nama Kepala Keluarga', '-', '-', 'Wajib'],
    ['Alamat', '-', '-', 'Opsional'],
    ['Total Jiwa / Jiwa Menetap / Jumlah Jamban', '-', '-', 'Angka ≥ 0 (kosong = 0). Jiwa Menetap ≤ Total Jiwa'],
  ]
  Object.entries(questionnaireData).forEach(([pillar, questions]) => {
    questions.forEach((q) => {
      panduanRows.push([q.code, pillar, q.text, 'Ya / Tidak (kosongkan bila tidak ditanya)'])
    })
  })
  const panduanWs = XLSX.utils.aoa_to_sheet([panduanHeader, ...panduanRows])
  panduanWs['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 60 }, { wch: 48 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, dataWs, 'Data')
  XLSX.utils.book_append_sheet(wb, exampleWs, 'Contoh')
  XLSX.utils.book_append_sheet(wb, panduanWs, 'Panduan')
  XLSX.writeFile(wb, 'template_import_entry.xlsx')
}

function EntryPage({ profile, kelurahan, rw, rt }: { profile: UserProfile | null; kelurahan: Region[]; rw: Region[]; rt: Region[] }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [nextEntryNumber, setNextEntryNumber] = useState(1)
  const [searchKeyword, setSearchKeyword] = useState('')
  
  // Filter regions based on user profile.
  // Kader terkunci pada wilayahnya; super_admin/admin bebas memilih wilayah apapun.
  const scopeByProfile = profile?.role === 'kader'
  const userKelurahan = scopeByProfile && profile?.kelurahanId ? kelurahan.filter(k => k.id === profile.kelurahanId) : kelurahan
  const userRw = !scopeByProfile ? rw :
                profile?.rwId ? rw.filter(r => r.id === profile.rwId) :
                profile?.kelurahanId ? rw.filter(r => r.kelurahanId === profile.kelurahanId) : rw
  const userRt = !scopeByProfile ? rt :
                profile?.rtId ? rt.filter(r => r.id === profile.rtId) :
                profile?.rwId ? rt.filter(r => r.rwId === profile.rwId) :
                profile?.kelurahanId ? rt.filter(r => {
                  const rwItem = rw.find(rw => rw.id === r.rwId)
                  return rwItem?.kelurahanId === profile.kelurahanId
                }) : rt

  const [selectedKelurahanId, setSelectedKelurahanId] = useState(scopeByProfile ? profile?.kelurahanId || '' : '')
  const [selectedRwId, setSelectedRwId] = useState(scopeByProfile ? profile?.rwId || '' : '')
  const [selectedRtId, setSelectedRtId] = useState(scopeByProfile ? profile?.rtId || '' : '')

  // Profil tiba belakangan (async); selaraskan auto-filter wilayah kader
  // tanpa menimpa pilihan yang sudah diubah user. Admin tidak diisi otomatis
  // agar bebas memilih wilayah apapun.
  useEffect(() => {
    if (profile?.role !== 'kader') return
    if (profile?.kelurahanId) setSelectedKelurahanId((prev) => prev || profile.kelurahanId || '')
    if (profile?.rwId) setSelectedRwId((prev) => prev || profile.rwId || '')
    if (profile?.rtId) setSelectedRtId((prev) => prev || profile.rtId || '')
  }, [profile?.role, profile?.kelurahanId, profile?.rwId, profile?.rtId])

  // Nama penginput: dipetakan dari profiles via officer_id.
  // Bila RLS membatasi, fallback ke nama profil sendiri / '-'.
  const [officerNames, setOfficerNames] = useState<Record<string, string>>({})

  function officerName(officerId: string) {
    if (officerNames[officerId]) return officerNames[officerId]
    if (profile && officerId === profile.id && profile.fullName) return profile.fullName
    return '-'
  }

  // Baris entry yang diperluas untuk melihat semua sub-KK di dalamnya
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [familyCards, setFamilyCards] = useState<FamilyCard[]>([])
  const [questionnaireResponses, setQuestionnaireResponses] = useState<QuestionnaireResponse[]>([])
  const [currentKkIndex, setCurrentKkIndex] = useState(0)

  function isSingleChoiceQuestionnaire(pillar: string) {
    return pillar === 'jamban' || pillar === 'sumber_air'
  }

  function normalizeSingleChoiceResponses(responses: QuestionnaireResponse[]) {
    const selectedKeys = new Set<string>()
    return responses.map(response => {
      if (!isSingleChoiceQuestionnaire(response.pillar) || !response.answer) return response
      const key = `${response.familyCardId}:${response.pillar}`
      if (selectedKeys.has(key)) return { ...response, answer: false }
      selectedKeys.add(key)
      return response
    })
  }

  async function loadEntries() {
    if (!supabase || !profile) {
      console.log('loadEntries: supabase or profile missing', { supabase: !!supabase, profile: !!profile })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let entriesQuery = supabase.from('entries').select('*')
      if (profile.role === 'kader') entriesQuery = entriesQuery.eq('officer_id', profile.id)
      const { data, error } = await entriesQuery.order('entry_date', { ascending: false })
      console.log('loadEntries result:', { data, error: error?.message })
      if (error) {
        console.error('Error loading entries:', error)
        setError(`Gagal memuat data: ${error.message}`)
        setLoading(false)
        return
      }
      if (!data || data.length === 0) {
        setEntries([])
        setLoading(false)
        return
      }
      const entryIds = data.map((e: any) => e.id)
      // Batch-load all family cards in a single query (fixes N+1)
      const { data: fcData, error: fcError } = await supabase
        .from('family_cards')
        .select('*')
        .in('entry_id', entryIds)
      if (fcError) console.error('Error loading family cards:', fcError)
      const fcArray = fcData || []
      const fcIds = fcArray.map((fc: any) => fc.id)
      // Batch-load all questionnaire responses in a single query
      const { data: qrData, error: qrError } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .in('family_card_id', fcIds.length > 0 ? fcIds : [''])
      if (qrError) console.error('Error loading questionnaire responses:', qrError)
      const qrArray = qrData || []
      // Group family cards by entry_id
      const fcByEntryId = new Map<string, typeof fcArray>()
      fcArray.forEach((fc: any) => {
        const arr = fcByEntryId.get(fc.entry_id) || []
        arr.push(fc)
        fcByEntryId.set(fc.entry_id, arr)
      })
      // Group questionnaire responses by family_card_id
      const qrByFcId = new Map<string, typeof qrArray>()
      qrArray.forEach((qr: any) => {
        const arr = qrByFcId.get(qr.family_card_id) || []
        arr.push(qr)
        qrByFcId.set(qr.family_card_id, arr)
      })
      // Map entries with proper camelCase conversion and grouped relations
      const entriesWithDetails: Entry[] = data.map((entry: any) => {
        const fcs = fcByEntryId.get(entry.id) || []
        const allQr: QuestionnaireResponse[] = []
        fcs.forEach((fc: any) => {
          const fcrs = qrByFcId.get(fc.id) || []
          fcrs.forEach((qr: any) => {
            allQr.push({
              id: qr.id,
              familyCardId: qr.family_card_id,
              pillar: qr.pillar,
              questionCode: qr.question_code,
              answer: qr.answer
            })
          })
        })
        return {
          id: entry.id,
          entryNumber: entry.entry_number,
          entryDate: entry.entry_date,
          officerId: entry.officer_id,
          kelurahanId: entry.kelurahan_id,
          rwId: entry.rw_id,
          rtId: entry.rt_id,
          familyCards: fcs.map((fc: any) => ({
            id: fc.id,
            entryId: fc.entry_id,
            kkSequence: fc.kk_sequence,
            kkNumber: fc.kk_number,
            nikKepalaKeluarga: fc.nik_kepala_keluarga || '',
            kepalaKeluarga: fc.kepala_keluarga || '',
            address: fc.address,
            totalJiwa: fc.total_jiwa,
            jiwaMenetap: fc.jiwa_menetap,
            jambanCount: fc.jamban_count
          })),
          questionnaireResponses: allQr
        }
      })
      setEntries(entriesWithDetails)
      // Petakan officer_id -> nama lengkap untuk kolom "Nama Penginput"
      try {
        const officerIds = [...new Set(data.map((e: any) => e.officer_id).filter(Boolean))] as string[]
        if (officerIds.length > 0 && supabase) {
          const { data: profData, error: profError } = await supabase.from('profiles').select('id, full_name').in('id', officerIds)
          if (!profError && profData) {
            const map: Record<string, string> = {}
            profData.forEach((p: any) => { if (p?.id && p?.full_name) map[p.id] = String(p.full_name) })
            setOfficerNames(map)
          }
        }
      } catch (mapErr) {
        console.warn('Gagal memuat nama penginput:', mapErr)
      }
      void getNextEntryNumber(entriesWithDetails)
    } catch (err) {
      console.error('Unexpected error in loadEntries:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function getNextEntryNumber(loadedEntries?: Entry[]) {
    if (!supabase || !profile) {
      console.log('getNextEntryNumber: supabase or profile missing', { supabase: !!supabase, profile: !!profile })
      return
    }
    // Gunakan entries yang baru dimuat jika ada, jika tidak gunakan state entries
    const currentEntries = loadedEntries || entries
    try {
      // Always calculate local max first to ensure we have a correct fallback
      const entryNumbers = currentEntries.map(entry => entry.entryNumber).filter(Number.isFinite)
      const localMaxEntryNumber = entryNumbers.length > 0 ? Math.max(...entryNumbers) : 0
      console.log('Local max entry number:', localMaxEntryNumber, 'Total entries:', currentEntries.length)
      
      const { data, error } = await supabase.rpc('get_next_entry_number', { officer_id: profile.id })
      console.log('getNextEntryNumber result:', { data, error: error?.message })
      
      if (error) {
        console.error('Error getting next entry number from RPC, using local calculation')
        setNextEntryNumber(localMaxEntryNumber + 1)
        return
      }
      
      // Use the maximum between RPC value and local max + 1 to ensure we never go backwards
      const rpcValue = Number(data)
      const nextNumber = Number.isFinite(rpcValue) && rpcValue > 0
        ? Math.max(Math.trunc(rpcValue), localMaxEntryNumber + 1)
        : localMaxEntryNumber + 1
      setNextEntryNumber(nextNumber)
      console.log('Setting next entry number to:', nextNumber)
    } catch (err) {
      console.error('Unexpected error in getNextEntryNumber:', err)
      // Fallback to local calculation
      const maxEntryNumber = currentEntries.length > 0 ? Math.max(...currentEntries.map(e => e.entryNumber)) : 0
      setNextEntryNumber(maxEntryNumber + 1)
    }
  }

  useEffect(() => {
    void loadEntries()
  }, [profile])

  // Filter entries based on search keyword
  const filteredEntries = entries.filter(entry => {
    if (!searchKeyword.trim()) return true
    const kw = searchKeyword.toLowerCase()
    const kelName = kelurahan.find(k => k.id === entry.kelurahanId)?.name || ''
    const rwName = entry.rwId ? rw.find(r => r.id === entry.rwId)?.name || '' : ''
    const rtName = entry.rtId ? rt.find(r => r.id === entry.rtId)?.name || '' : ''
    const firstKk = entry.familyCards[0]
    
    return entry.entryDate.includes(searchKeyword)
      || entry.entryNumber.toString().includes(kw)
      || officerName(entry.officerId).toLowerCase().includes(kw)
      || kelName.toLowerCase().includes(kw)
      || rwName.toLowerCase().includes(kw)
      || rtName.toLowerCase().includes(kw)
      || firstKk?.kepalaKeluarga.toLowerCase().includes(kw)
      || firstKk?.kkNumber.toLowerCase().includes(kw)
      || firstKk?.nikKepalaKeluarga.toLowerCase().includes(kw)
  })

  function exportExcel() {
    if (filteredEntries.length === 0) { window.alert('Tidak ada data entry untuk diexport.'); return }
    const header = ['No', 'Nomor Entry', 'Tanggal', 'Nama Penginput', 'Kelurahan', 'RW', 'RT', 'KK Pertama', 'Kepala Keluarga', 'NIK', 'Total KK', 'Total Jiwa', 'Jiwa Menetap', 'Total Jamban']
    const rows: (string | number)[][] = []
    filteredEntries.forEach((entry, idx) => {
      const kelName = entry.kelurahanId ? kelurahan.find(k => k.id === entry.kelurahanId)?.name : undefined
      const rwName = entry.rwId ? rw.find(r => r.id === entry.rwId)?.name : undefined
      const rtName = entry.rtId ? rt.find(r => r.id === entry.rtId)?.name : undefined
      const firstKk = entry.familyCards[0]
      const totalJamban = entry.familyCards.reduce((sum, fc) => sum + (fc.jambanCount || 0), 0)
      
      rows.push([
        idx + 1,
        entry.entryNumber,
        entry.entryDate,
        officerName(entry.officerId),
        kelName ?? '-',
        rwName ? `RW ${rwName}` : '-',
        rtName ? `RT ${rtName}` : '-',
        firstKk?.kkNumber || '-',
        firstKk?.kepalaKeluarga || '-',
        firstKk?.nikKepalaKeluarga || '-',
        entry.familyCards.length,
        entry.familyCards.reduce((sum, fc) => sum + (fc.totalJiwa || 0), 0),
        entry.familyCards.reduce((sum, fc) => sum + (fc.jiwaMenetap || 0), 0),
        totalJamban
      ])
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ fileName: `data_entry_${today}.xlsx`, sheetName: 'Data Entry', header, rows })
  }

  // --- Import Excel (validasi dulu, konfirmasi, baru simpan) ---
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [pendingImport, setPendingImport] = useState<ImportGroup[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')

  function parseImportRows(rows: unknown[][]): { groups: ImportGroup[]; errors: string[] } {
    const errors: string[] = []
    const codeToPillar = importQuestionPillar()
    const header = (rows[0] ?? []).map((h) => String(h ?? '').trim())
    const colIndex: Record<string, number> = {}
    header.forEach((h, i) => { if (h && colIndex[h] === undefined) colIndex[h] = i })
    const missing = IMPORT_BASE_HEADERS.filter((h) => colIndex[h] === undefined)
    if (missing.length > 0) return { groups: [], errors: [`Header wajib tidak ditemukan: ${missing.join(', ')}. Unduh template terbaru.`] }
    const questionCols: Array<{ code: string; pillar: string; index: number }> = []
    header.forEach((h, i) => {
      if ((IMPORT_BASE_HEADERS as readonly string[]).includes(h)) return
      if (!h) return
      const pillar = codeToPillar[h]
      if (!pillar) errors.push(`Header tidak dikenal: "${h}". Hapus kolom ini atau gunakan kode pada sheet Panduan.`)
      else questionCols.push({ code: h, pillar, index: i })
    })
    if (errors.length > 0) return { groups: [], errors }
    const cell = (r: unknown[], name: string): unknown => {
      const v = r[colIndex[name]]
      return v === null || v === undefined ? '' : v
    }

    type StagedCard = ImportCard & { entryDate: string; kelurahanId: string; rwId: string; rtId: string; groupTag: string }
    const staged: StagedCard[] = []
    const isKader = profile?.role === 'kader'
    rows.slice(1).forEach((r, i) => {
      const rowNum = i + 2
      const rowArray = r as unknown[]
      if (rowArray.every((v) => String(v ?? '').trim() === '')) return
      const prefix = `Baris ${rowNum}:`
      const entryDate = parseImportDate(cell(rowArray, 'Tanggal (YYYY-MM-DD)'))
      if (!entryDate) { errors.push(`${prefix} Tanggal tidak valid (format YYYY-MM-DD).`); return }
      const kelName = String(cell(rowArray, 'Kelurahan')).trim().toLowerCase()
      const kel = kelurahan.find((k) => k.name.trim().toLowerCase() === kelName)
      if (!kel) { errors.push(`${prefix} Kelurahan tidak ditemukan.`); return }
      if (isKader && profile?.kelurahanId && kel.id !== profile.kelurahanId) { errors.push(`${prefix} di luar wilayah Anda.`); return }
      const rwName = String(cell(rowArray, 'RW')).trim()
      const rwInKel = rw.filter((w) => w.kelurahanId === kel.id)
      const rwItem = rwInKel.find((w) => w.name.trim() === rwName)
        ?? rwInKel.find((w) => normalizeRegionNumber(w.name) === normalizeRegionNumber(rwName))
      if (!rwItem) { errors.push(`${prefix} RW "${rwName || '-'}" tidak ditemukan di kelurahan ${kel.name}. Pastikan format sel RW di Excel adalah Teks bila memakai nol depan (mis. "01").`); return }
      if (isKader && profile?.rwId && rwItem.id !== profile.rwId) { errors.push(`${prefix} di luar wilayah Anda.`); return }
      const rtName = String(cell(rowArray, 'RT')).trim()
      const rtInRw = rt.filter((t) => t.rwId === rwItem.id)
      const rtItem = rtInRw.find((t) => t.name.trim() === rtName)
        ?? rtInRw.find((t) => normalizeRegionNumber(t.name) === normalizeRegionNumber(rtName))
      if (!rtItem) { errors.push(`${prefix} RT "${rtName || '-'}" tidak ditemukan di RW tersebut. Pastikan format sel RT di Excel adalah Teks bila memakai nol depan (mis. "01").`); return }
      if (isKader && profile?.rtId && rtItem.id !== profile.rtId) { errors.push(`${prefix} di luar wilayah Anda.`); return }
      const kkNumber = String(cell(rowArray, 'No KK (16 digit)')).replace(/\D/g, '').slice(0, 16)
      if (!kkNumber) { errors.push(`${prefix} No KK wajib diisi (angka, maks 16 digit).`); return }
      const name = String(cell(rowArray, 'Nama Kepala Keluarga')).trim()
      if (!name) { errors.push(`${prefix} Nama Kepala Keluarga wajib diisi.`); return }
      const nikRaw = String(cell(rowArray, 'NIK Kepala Keluarga')).replace(/\D/g, '').slice(0, 16)
      const nikInput = String(cell(rowArray, 'NIK Kepala Keluarga')).trim()
      if (nikInput && !/^\d{1,16}$/.test(nikInput)) { errors.push(`${prefix} NIK harus angka maks 16 digit.`); return }
      const totalJiwa = parseImportInt(cell(rowArray, 'Total Jiwa'))
      const jiwaMenetap = parseImportInt(cell(rowArray, 'Jiwa Menetap'))
      const jambanCount = parseImportInt(cell(rowArray, 'Jumlah Jamban'))
      if (totalJiwa === null || jiwaMenetap === null || jambanCount === null) { errors.push(`${prefix} Total Jiwa / Jiwa Menetap / Jumlah Jamban harus angka ≥ 0.`); return }
      if (jiwaMenetap > totalJiwa) { errors.push(`${prefix} Jiwa Menetap tidak boleh melebihi Total Jiwa.`); return }
      const answers: ImportAnswer[] = []
      let rowOk = true
      questionCols.forEach((q) => {
        const parsed = parseImportBool(rowArray[q.index])
        if (parsed === 'invalid') { errors.push(`${prefix} jawaban "${q.code}" harus Ya/Tidak (atau dikosongkan).`); rowOk = false }
        else if (parsed !== null) answers.push({ pillar: q.pillar, code: q.code, answer: parsed })
      })
      if (!rowOk) return
      staged.push({
        rowNum, entryDate, kelurahanId: kel.id, rwId: rwItem.id, rtId: rtItem.id,
        groupTag: String(cell(rowArray, 'Kelompok Entry')).trim(),
        kkNumber, nik: nikRaw, name, address: String(cell(rowArray, 'Alamat')).trim(),
        totalJiwa, jiwaMenetap, jambanCount, answers,
      })
    })
    if (errors.length > 0) return { groups: [], errors }
    if (staged.length === 0) return { groups: [], errors: ['Tidak ada baris data. Isi sheet Data mengikuti template.'] }

    // Samakan tanggal + wilayah + kelompok = 1 entry (maks 20 KK seperti form).
    // Kelompok kosong = tiap baris menjadi entry sendiri.
    const groupMap = new Map<string, StagedCard[]>()
    staged.forEach((s, idx) => {
      const key = s.groupTag ? [s.entryDate, s.kelurahanId, s.rwId, s.rtId, s.groupTag].join('|') : `single-${idx}`
      const arr = groupMap.get(key) || []
      arr.push(s)
      groupMap.set(key, arr)
    })
    const groups: ImportGroup[] = []
    groupMap.forEach((cards) => {
      if (cards.length > 20) { errors.push(`Kelompok entry tanggal ${cards[0].entryDate} berisi ${cards.length} KK (maksimal 20 seperti form).`); return }
      const warnings: string[] = []
      // Samakan rule form: pilar single-choice hanya 1 jawaban Ya (sisanya jadi Tidak)
      const normalized = cards.map((c) => {
        const seen = new Set<string>()
        const answers = c.answers.map((a) => {
          if (!IMPORT_SINGLE_CHOICE_PILLARS.includes(a.pillar) || !a.answer || seen.has(a.pillar)) {
            if (IMPORT_SINGLE_CHOICE_PILLARS.includes(a.pillar) && a.answer && seen.has(a.pillar)) {
              warnings.push(`Baris ${c.rowNum}: pilar ${a.pillar} hanya boleh 1 jawaban Ya — "${a.code}" dianggap Tidak.`)
              return { ...a, answer: false }
            }
            return a
          }
          seen.add(a.pillar)
          return a
        })
        return { ...c, answers }
      })
      groups.push({
        key: [cards[0].entryDate, cards[0].kelurahanId, cards[0].rwId, cards[0].rtId, cards[0].groupTag || `single-${cards[0].rowNum}`].join('|'),
        entryDate: cards[0].entryDate, kelurahanId: cards[0].kelurahanId, rwId: cards[0].rwId, rtId: cards[0].rtId,
        cards: normalized, warnings,
      })
    })
    if (errors.length > 0) return { groups: [], errors }
    return { groups, errors }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportErrors([])
    setPendingImport(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets['Data'] ?? wb.Sheets[wb.SheetNames[0]]
      if (!ws) { setImportErrors(['Sheet tidak ditemukan di file.']); return }
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false }) as unknown[][]
      const { groups, errors } = parseImportRows(rows)
      if (errors.length > 0) { setImportErrors(errors); return }
      setPendingImport(groups)
    } catch (err) {
      setImportErrors([err instanceof Error ? `Gagal membaca file: ${err.message}` : 'Gagal membaca file.'])
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  async function executeImport() {
    if (!supabase || !profile || !pendingImport || pendingImport.length === 0) return
    setImporting(true)
    setImportProgress('')
    try {
      let localMax = entries.length > 0 ? Math.max(...entries.map((e) => e.entryNumber).filter(Number.isFinite)) : 0
      for (let gi = 0; gi < pendingImport.length; gi++) {
        const g = pendingImport[gi]
        setImportProgress(`Menyimpan entry ${gi + 1} dari ${pendingImport.length}…`)
        // Nomor entry mengikuti rule form (RPC per petugas, fallback lokal)
        let entryNumber = localMax + 1
        try {
          const { data } = await supabase.rpc('get_next_entry_number', { officer_id: profile.id })
          const rpcValue = Number(data)
          if (Number.isFinite(rpcValue) && rpcValue > 0) entryNumber = Math.max(Math.trunc(rpcValue), localMax + 1)
        } catch { /* pakai fallback lokal */ }
        const { data: newEntry, error: entryError } = await supabase.from('entries').insert({
          entry_number: entryNumber,
          entry_date: g.entryDate,
          officer_id: profile.id,
          created_by: profile.id,
          kelurahan_id: g.kelurahanId,
          rw_id: g.rwId,
          rt_id: g.rtId,
        }).select().single()
        if (entryError || !newEntry) throw new Error(`Gagal menyimpan entry tanggal ${g.entryDate}: ${entryError?.message || 'unknown'}`)
        localMax = Math.max(localMax, entryNumber)
        const fcPayload = g.cards.map((c, idx) => ({
          entry_id: newEntry.id,
          kk_sequence: idx + 1,
          kk_number: c.kkNumber,
          nik_kepala_keluarga: c.nik,
          kepala_keluarga: c.name,
          address: c.address,
          total_jiwa: c.totalJiwa,
          jiwa_menetap: c.jiwaMenetap,
          jamban_count: c.jambanCount,
        }))
        const { data: newFcs, error: fcError } = await supabase.from('family_cards').insert(fcPayload).select()
        if (fcError || !newFcs) throw new Error(`Gagal menyimpan KK tanggal ${g.entryDate}: ${fcError?.message || 'unknown'}`)
        const orderedFcs = [...(newFcs as Array<{ id: string; kk_sequence: number }>)].sort((a, b) => a.kk_sequence - b.kk_sequence)
        const qrPayload: Array<{ family_card_id: string; pillar: string; question_code: string; answer: boolean }> = []
        orderedFcs.forEach((fc, idx) => {
          g.cards[idx].answers.forEach((a) => {
            qrPayload.push({ family_card_id: fc.id, pillar: a.pillar, question_code: a.code, answer: a.answer })
          })
        })
        if (qrPayload.length > 0) {
          const { error: qrError } = await supabase.from('questionnaire_responses').insert(qrPayload)
          if (qrError) throw new Error(`Gagal menyimpan kuesioner tanggal ${g.entryDate}: ${qrError.message}`)
        }
      }
      const totalKk = pendingImport.reduce((sum, g) => sum + g.cards.length, 0)
      setPendingImport(null)
      setImportProgress('')
      window.alert(`Import selesai: ${pendingImport.length} entry, ${totalKk} KK tersimpan.`)
      void loadEntries()
    } catch (err) {
      setImportErrors([err instanceof Error ? err.message : 'Import gagal.'])
    } finally {
      setImporting(false)
    }
  }

  function openForm(entry?: Entry) {
    setEditing(entry ?? null)
    setError('')
    const lockWilayah = profile?.role === 'kader'
    setSelectedKelurahanId(entry?.kelurahanId || (lockWilayah ? profile?.kelurahanId || '' : ''))
    setSelectedRwId(entry?.rwId || (lockWilayah ? profile?.rwId || '' : ''))
    setSelectedRtId(entry?.rtId || (lockWilayah ? profile?.rtId || '' : ''))
    setFamilyCards(entry?.familyCards || [])
    setQuestionnaireResponses(normalizeSingleChoiceResponses(entry?.questionnaireResponses || []))
    setCurrentKkIndex(0)
    setFormOpen(true)
    if (!entry) void getNextEntryNumber()
  }

  function addFamilyCard() {
    if (familyCards.length >= 20) {
      window.alert('Maksimal 20 kartu keluarga per entry')
      return
    }
    setFamilyCards([...familyCards, {
      id: '',
      entryId: '',
      kkSequence: familyCards.length + 1,
      kkNumber: '',
      nikKepalaKeluarga: '',
      kepalaKeluarga: '',
      address: '',
      totalJiwa: 0,
      jiwaMenetap: 0,
      jambanCount: 0
    }])
    setCurrentKkIndex(familyCards.length)
  }

  function removeFamilyCard(index: number) {
    setFamilyCards(familyCards.filter((_, i) => i !== index))
    setQuestionnaireResponses(questionnaireResponses.filter(qr => {
      const fc = familyCards[index]
      return qr.familyCardId !== fc.id
    }))
    if (currentKkIndex >= familyCards.length - 1) {
      setCurrentKkIndex(Math.max(0, familyCards.length - 2))
    }
  }

  function handleQuestionnaireChange(pillar: string, questionCode: string, answer: boolean) {
    const currentFc = familyCards[currentKkIndex]
    // Use temporary ID for unsaved family cards
    const tempFamilyCardId = currentFc.id || `temp-${currentKkIndex}`

    setQuestionnaireResponses(prev => {
      const existing = prev.find(qr => qr.familyCardId === tempFamilyCardId && qr.pillar === pillar && qr.questionCode === questionCode)
      if (existing) {
        return prev.map(qr => 
          qr.familyCardId === tempFamilyCardId && qr.pillar === pillar && qr.questionCode === questionCode
            ? { ...qr, answer }
            : qr
        )
      }
      return [...prev, {
        id: '',
        familyCardId: tempFamilyCardId,
        pillar,
        questionCode,
        answer
      }]
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) {
      setError('Supabase atau profil tidak tersedia')
      return
    }
    const data = new FormData(event.currentTarget)
    
    setSubmitting(true)
    setError('')

    try {
      let entryId = editing?.id

      if (!editing) {
        const formEntryNumber = Number(data.get('entryNumber'))
        const entryNumber = Number.isFinite(formEntryNumber) && formEntryNumber > 0
          ? Math.trunc(formEntryNumber)
          : Number.isFinite(nextEntryNumber) && nextEntryNumber > 0
            ? Math.trunc(nextEntryNumber)
            : 1

        // Create entry
        const { data: newEntry, error: entryError } = await supabase.from('entries').insert({
          entry_number: entryNumber,
          entry_date: String(data.get('entryDate')),
          officer_id: profile.id,
          created_by: profile.id,
          kelurahan_id: selectedKelurahanId,
          rw_id: selectedRwId,
          rt_id: selectedRtId
        }).select().single()

        if (entryError || !newEntry) {
          console.error('Entry creation error:', entryError)
          setError(entryError?.message || 'Gagal membuat entry')
          setSubmitting(false)
          return
        }
        entryId = newEntry.id
        console.log('Entry created successfully:', entryId)
      } else {
        // Update entry
        const { error: entryError } = await supabase.from('entries').update({
          entry_date: String(data.get('entryDate')),
          kelurahan_id: selectedKelurahanId,
          rw_id: selectedRwId,
          rt_id: selectedRtId
        }).eq('id', editing.id)

        if (entryError) {
          console.error('Entry update error:', entryError)
          setError(entryError.message)
          setSubmitting(false)
          return
        }
        console.log('Entry updated successfully:', editing.id)
      }

      // Handle family cards
      for (const fc of familyCards) {
        let fcId = fc.id
        if (!fc.id) {
          const { data: newFc, error: fcError } = await supabase.from('family_cards').insert({
            entry_id: entryId,
            kk_sequence: fc.kkSequence,
            kk_number: fc.kkNumber,
            nik_kepala_keluarga: fc.nikKepalaKeluarga,
            kepala_keluarga: fc.kepalaKeluarga,
            address: fc.address,
            total_jiwa: fc.totalJiwa,
            jiwa_menetap: fc.jiwaMenetap,
            jamban_count: fc.jambanCount
          }).select().single()

          if (fcError || !newFc) {
            console.error('Family card creation error:', fcError)
            setError(fcError?.message || 'Gagal membuat kartu keluarga')
            setSubmitting(false)
            return
          }
          fcId = newFc.id
          console.log('Family card created successfully:', fcId)
        } else {
          // Update existing family card
          const { error: fcUpdateError } = await supabase.from('family_cards').update({
            kk_sequence: fc.kkSequence,
            kk_number: fc.kkNumber,
            nik_kepala_keluarga: fc.nikKepalaKeluarga,
            kepala_keluarga: fc.kepalaKeluarga,
            address: fc.address,
            total_jiwa: fc.totalJiwa,
            jiwa_menetap: fc.jiwaMenetap,
            jamban_count: fc.jambanCount
          }).eq('id', fc.id)

          if (fcUpdateError) {
            console.error('Family card update error:', fcUpdateError)
            setError(fcUpdateError.message || 'Gagal mengupdate kartu keluarga')
            setSubmitting(false)
            return
          }
          console.log('Family card updated successfully:', fc.id)
        }

        // Handle questionnaire responses for this family card
        const tempFcId = fc.id || `temp-${familyCards.indexOf(fc)}`
        const relevantResponses = questionnaireResponses.filter(q => q.familyCardId === fc.id || q.familyCardId === fcId || q.familyCardId === tempFcId)
        for (const qr of relevantResponses) {
          if (!qr.id) {
            const { error: qrError } = await supabase.from('questionnaire_responses').insert({
              family_card_id: fcId,
              pillar: qr.pillar,
              question_code: qr.questionCode,
              answer: qr.answer
            })
            if (qrError) {
              console.error('Questionnaire response creation error:', qrError)
            }
          } else {
            const { error: qrError } = await supabase.from('questionnaire_responses').update({ answer: qr.answer }).eq('id', qr.id)
            if (qrError) {
              console.error('Questionnaire response update error:', qrError)
            }
          }
        }
      }

      setFormOpen(false)
      void loadEntries()
      void getNextEntryNumber()
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteEntry(entry: Entry) {
    if (!window.confirm(`Hapus entry nomor ${entry.entryNumber}?`)) return
    if (!supabase) return

    const { error } = await supabase.from('entries').delete().eq('id', entry.id)
    if (error) {
      window.alert(`Gagal menghapus entry: ${error.message}`)
      return
    }
    void loadEntries()
  }

  if (loading) return <main className="auth-shell"><p className="auth-loading">Memuat data entry…</p></main>

  if (error && !formOpen) return <section className="master-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">ENTRY DATA</p>
        <h1>Data Rumah & Keluarga</h1>
        <p>Kelola data entry kader/relawan dengan auto-filter wilayah.</p>
      </div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah Entry</button>
    </div>
    <div className="error-message">{error}</div>
    <button className="text-button" onClick={() => { setError(''); void loadEntries() }} type="button">Coba lagi</button>
  </section>

  return <section className="master-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">ENTRY DATA</p>
        <h1>Data Rumah & Keluarga</h1>
        <p>Kelola data entry kader/relawan dengan auto-filter wilayah.</p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button" disabled={entries.length === 0}>Export Excel</button>
        <button className="secondary" onClick={downloadEntryImportTemplate} type="button">Download Template</button>
        <button className="secondary" onClick={() => importInputRef.current?.click()} type="button" disabled={importing}>Import Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Entry</button>
        <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} style={{ display: 'none' }} />
      </div>
    </div>

    {!formOpen && importErrors.length > 0 && (
      <div className="form-section" style={{ borderColor: '#fecaca' }}>
        <h2>Import dibatalkan — perbaiki dulu ({importErrors.length} masalah)</h2>
        <ul style={{ margin: '12px 0', paddingLeft: '20px', color: '#b91c1c', fontSize: '13px', maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '4px' }}>
          {importErrors.slice(0, 30).map((msg, i) => <li key={i}>{msg}</li>)}
        </ul>
        {importErrors.length > 30 && <p style={{ color: 'var(--muted)', fontSize: '12px' }}>…dan {importErrors.length - 30} masalah lainnya.</p>}
        <div className="form-actions">
          <button className="secondary" onClick={() => setImportErrors([])} type="button">Tutup</button>
        </div>
      </div>
    )}

    {!formOpen && pendingImport && (
      <div className="form-section">
        <h2>Konfirmasi import</h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          Siap menyimpan {pendingImport.length} entry dengan {pendingImport.reduce((s, g) => s + g.cards.length, 0)} KK
          {' '}dan {pendingImport.reduce((s, g) => s + g.cards.reduce((a, c) => a + c.answers.length, 0), 0)} jawaban kuesioner
          {' '}sebagai {profile?.fullName || 'petugas'}.
        </p>
        {pendingImport.flatMap((g) => g.warnings).length > 0 && (
          <ul style={{ margin: '12px 0', paddingLeft: '20px', color: '#92400e', fontSize: '13px', display: 'grid', gap: '4px' }}>
            {pendingImport.flatMap((g) => g.warnings).slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
        {importProgress && <p style={{ fontSize: '13px', fontWeight: 600 }}>{importProgress}</p>}
        <div className="form-actions">
          <button className="secondary" onClick={() => setPendingImport(null)} type="button" disabled={importing}>Batal</button>
          <button className="primary" onClick={() => void executeImport()} type="button" disabled={importing}>{importing ? 'Mengimpor…' : 'Konfirmasi & Impor'}</button>
        </div>
      </div>
    )}

    {formOpen && <form className="entry-form" onSubmit={submit}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ENTRY DATA</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Entry</h1>
          <p>Lengkapi data entry dengan kartu keluarga dan questionnaire.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <section className="form-section">
        <h2>Informasi Entry</h2>
        <div className="form-grid">
          <label>No. Urut Entry<input name="entryNumber" value={editing?.entryNumber || nextEntryNumber} disabled /></label>
          <label>Tanggal Entry<input name="entryDate" type="date" defaultValue={editing?.entryDate || new Date().toISOString().split('T')[0]} required /></label>
          <label>Nama Petugas<input value={profile?.fullName || ''} disabled /></label>
          <label>Kelurahan
            <select value={selectedKelurahanId} onChange={(e) => setSelectedKelurahanId(e.target.value)} required>
              <option value="">Pilih kelurahan</option>
              {userKelurahan.length === 0 ? <option value="" disabled>Tidak ada data kelurahan</option> : userKelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
          <label>RW
            <select value={selectedRwId} onChange={(e) => setSelectedRwId(e.target.value)} disabled={!selectedKelurahanId} required>
              <option value="">{selectedKelurahanId ? 'Pilih RW' : 'Pilih kelurahan terlebih dahulu'}</option>
              {userRw.filter(r => !selectedKelurahanId || r.kelurahanId === selectedKelurahanId).map(r => <option key={r.id} value={r.id}>RW {r.name}</option>)}
            </select>
          </label>
          <label>RT
            <select value={selectedRtId} onChange={(e) => setSelectedRtId(e.target.value)} disabled={!selectedRwId} required>
              <option value="">{selectedRwId ? 'Pilih RT' : 'Pilih RW terlebih dahulu'}</option>
              {userRt.filter(r => !selectedRwId || r.rwId === selectedRwId).map(r => <option key={r.id} value={r.id}>RT {r.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="form-section">
        <div className="section-title">
          <div><h2>Kartu Keluarga</h2><p>Tambahkan kartu keluarga (max 20) dalam satu entry</p></div>
          <button className="text-button" onClick={addFamilyCard} type="button">+ Tambah KK</button>
        </div>

        {familyCards.length === 0 && <div className="empty-state"><span>♙</span><h2>Belum ada kartu keluarga</h2><p>Klik tombol di atas untuk menambahkan kartu keluarga.</p></div>}

        {familyCards.map((fc, index) => (
          <div key={index} className="kk-card" style={{ border: currentKkIndex === index ? '2px solid #007bff' : '1px solid #ddd', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <strong>{index === 0 ? '🏠 Kepala Keluarga Utama' : `KK #${fc.kkSequence}`}</strong>
              <button className="text-button" onClick={() => removeFamilyCard(index)} type="button">Hapus</button>
            </div>
            <div className="form-grid">
              <label>No. KK<input value={fc.kkNumber} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].kkNumber = e.target.value.replace(/\D/g, '').slice(0, 16)
                setFamilyCards(updated)
              }} inputMode="numeric" maxLength={16} placeholder="Maksimal 16 digit nomor KK" required /></label>
              <label>NIK Kepala Keluarga<input value={fc.nikKepalaKeluarga} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].nikKepalaKeluarga = e.target.value.replace(/\D/g, '').slice(0, 16)
                setFamilyCards(updated)
              }} inputMode="numeric" maxLength={16} placeholder="Maksimal 16 digit NIK kepala keluarga" /></label>
              <label>Nama Kepala Keluarga<input value={fc.kepalaKeluarga} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].kepalaKeluarga = e.target.value
                setFamilyCards(updated)
              }} placeholder="Nama lengkap kepala keluarga" required /></label>
              <label>Alamat<textarea value={fc.address} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].address = e.target.value
                setFamilyCards(updated)
              }} rows={2} placeholder="Alamat lengkap" /></label>
              <label>Jumlah Jiwa<input type="number" value={fc.totalJiwa || ''} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].totalJiwa = parseInt(e.target.value) || 0
                setFamilyCards(updated)
              }} inputMode="numeric" /></label>
              <label>Jiwa Menetap<input type="number" value={fc.jiwaMenetap || ''} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].jiwaMenetap = parseInt(e.target.value) || 0
                setFamilyCards(updated)
              }} inputMode="numeric" /></label>
              <label>Jumlah Sarana Jamban<input type="number" value={fc.jambanCount || ''} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].jambanCount = parseInt(e.target.value) || 0
                setFamilyCards(updated)
              }} inputMode="numeric" /></label>
            </div>

            <button className="text-button" onClick={() => setCurrentKkIndex(index)} type="button">
              {currentKkIndex === index ? 'Sedang mengisi questionnaire' : 'Isi questionnaire untuk KK ini'}
            </button>

            {currentKkIndex === index && (
              <div style={{ marginTop: '16px' }}>
                {Object.entries(questionnaireData).map(([pillar, questions]) => (
                  <div key={pillar} style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '12px', textTransform: 'capitalize' }}>{pillar === 'fasilitas_jamban' ? 'Fasilitas Jamban' : pillar.replace('_', ' ')}</h3>
                    {questions.map(q => {
                      const tempFamilyCardId = fc.id || `temp-${index}`
                      const isSingleChoice = isSingleChoiceQuestionnaire(pillar)
                      return (
                        <div key={q.code} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type={isSingleChoice ? 'radio' : 'checkbox'}
                              name={`${pillar}-${tempFamilyCardId}`}
                              checked={questionnaireResponses.find(qr => 
                                qr.familyCardId === tempFamilyCardId && qr.pillar === pillar && qr.questionCode === q.code
                              )?.answer || false}
                              onChange={(e) => {
                                if (isSingleChoice) {
                                  setQuestionnaireResponses(prev => {
                                    // Remove all existing responses for this pillar and family card
                                    const filtered = prev.filter(qr =>
                                      !(qr.familyCardId === tempFamilyCardId && qr.pillar === pillar)
                                    )
                                    // Add the new selected response
                                    return [
                                      ...filtered,
                                      {
                                        id: '',
                                        familyCardId: tempFamilyCardId,
                                        pillar,
                                        questionCode: q.code,
                                        answer: true
                                      }
                                    ]
                                  })
                                } else {
                                  // For checkboxes: toggle as before
                                  handleQuestionnaireChange(pillar, q.code, e.target.checked)
                                }
                              }}
                            />
                            {q.text}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    {!formOpen && entries.length === 0 && <div className="empty-state"><span>⌂</span><h2>Belum ada data entry</h2><p>Klik tombol di atas untuk menambahkan data entry baru.</p></div>}

    {!formOpen && entries.length > 0 && (
      <>
        {/* Filter Pencarian */}
        <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="filter-grid cols-2" style={{ gap: '16px', margin: 0 }}>
            <label>Pencarian
              <input 
                type="text" 
                value={searchKeyword} 
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Cari nomor entry, tanggal, lokasi, KK, nama, atau NIK..." 
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="secondary" 
                onClick={() => setSearchKeyword('')}
                style={{ width: '100%' }}
              >
                Reset Pencarian
              </button>
            </div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table entry-results-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Nomor Entry</th>
                <th>Tanggal</th>
                <th>Nama Penginput</th>
                <th>Lokasi</th>
                <th>KK Pertama</th>
                <th>Kepala Keluarga</th>
                <th>Total KK</th>
                <th>Total Jiwa</th>
                <th>Jiwa Menetap</th>
                <th>Total Jamban</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, index) => {
                const kelName = kelurahan.find(k => k.id === entry.kelurahanId)?.name || '-'
                const rwName = entry.rwId ? rw.find(r => r.id === entry.rwId)?.name : undefined
                const rtName = entry.rtId ? rt.find(r => r.id === entry.rtId)?.name : undefined
                const firstKk = entry.familyCards[0]
                const totalJamban = entry.familyCards.reduce((sum, fc) => sum + (fc.jambanCount || 0), 0)
                const extraKkCount = entry.familyCards.length - 1
                const isExpanded = expandedEntryId === entry.id

                return (
                  <Fragment key={entry.id}>
                  <tr>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.entryNumber || '-'}</td>
                    <td>{entry.entryDate}</td>
                    <td style={{ fontWeight: 500 }}>{officerName(entry.officerId)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{kelName}</div>
                      <small style={{ color: 'var(--muted)' }}>
                        {rwName && `RW ${rwName}`} {rtName && `RT ${rtName}`}
                      </small>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600 }}>{firstKk?.kkNumber || '-'}</div>
                      {extraKkCount > 0 && (
                        <button className="text-button" onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)} type="button" style={{ marginTop: '4px' }}>
                          {isExpanded ? 'Sembunyikan' : `+${extraKkCount} KK lainnya`}
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{firstKk?.kepalaKeluarga || '-'}</div>
                      {firstKk?.nikKepalaKeluarga && (
                        <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          NIK: {firstKk.nikKepalaKeluarga}
                        </small>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.familyCards.length}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.familyCards.reduce((sum, fc) => sum + (fc.totalJiwa || 0), 0)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{entry.familyCards.reduce((sum, fc) => sum + (fc.jiwaMenetap || 0), 0)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{totalJamban}</td>
                    <td>
                      <div className="entry-actions">
                        <button className="text-button btn-edit" onClick={() => openForm(entry)} type="button">Edit</button>
                        <button className="text-button btn-delete" onClick={() => deleteEntry(entry)} type="button">Hapus</button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && extraKkCount > 0 && (
                    <tr className="sub-kk-row">
                      <td colSpan={12}>
                        <div className="sub-kk-list">
                          {entry.familyCards.map((fc, fcIndex) => (
                            <div className="sub-kk-item" key={fc.id || `${entry.id}-kk-${fcIndex}`}>
                              <strong>{fcIndex + 1}. {fc.kkNumber || '-'}</strong>
                              <span>{fc.kepalaKeluarga || '-'}{fc.nikKepalaKeluarga ? ` · NIK: ${fc.nikKepalaKeluarga}` : ''}</span>
                              <span>{fc.totalJiwa || 0} jiwa · {fc.jiwaMenetap || 0} menetap · {fc.jambanCount || 0} jamban</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </section>
}

function ProfilePage() {
  const [pkmInfo, setPkmInfo] = useState<PKMInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    namaPkm: '',
    alamatPkm: '',
    noTelepon: '',
    penanggungJawab: '',
    website: '',
    instagram: '',
    facebook: '',
    twitter: '',
  })

  async function loadPKMInfo() {
    if (!supabase) {
      console.error('Supabase client not available for PKM info')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      console.log('Loading PKM info from database...')
      const { data, error: loadError } = await supabase.from('pkm_info').select('*').single()
      console.log('Load PKM info result:', { data, error: loadError?.message })
      
      if (loadError) {
        console.error('Error loading PKM info:', loadError)
        // This is expected if no PKM info exists yet
        console.log('No PKM info found, using defaults')
        setLoading(false)
        return
      }
      
      if (!data) {
        console.log('No PKM info data found')
        setLoading(false)
        return
      }
      
      const info = mapPKMInfoRow(data as PKMInfoRow)
      setPkmInfo(info)
      setFormData({
        namaPkm: info.namaPkm,
        alamatPkm: info.alamatPkm,
        noTelepon: info.noTelepon,
        penanggungJawab: info.penanggungJawab,
        website: info.website || '',
        instagram: info.instagram || '',
        facebook: info.facebook || '',
        twitter: info.twitter || '',
      })
      setLogoPreview(info.logoUrl || null)
      console.log('PKM info loaded successfully')
    } catch (err) {
      console.error('Unexpected error in loadPKMInfo:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadPKMInfo() }, [])

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  async function uploadLogo(file: File): Promise<string | null> {
    if (!supabase) return null
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `pkm-logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('pkm-logos')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Logo upload error:', uploadError)
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('pkm-logos')
      .getPublicUrl(filePath)

    return publicUrl
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    
    setSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      let logoUrl = pkmInfo?.logoUrl
      let logoStoragePath = pkmInfo?.logoStoragePath

      // Upload new logo if provided
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile)
        if (uploadedUrl) {
          logoUrl = uploadedUrl
          logoStoragePath = `pkm-logos/${Date.now()}.${logoFile.name.split('.').pop()}`
        }
      }

      const payload = {
        nama_pkm: formData.namaPkm,
        alamat_pkm: formData.alamatPkm,
        no_telepon: formData.noTelepon,
        penanggung_jawab: formData.penanggungJawab,
        website: formData.website || null,
        instagram: formData.instagram || null,
        facebook: formData.facebook || null,
        twitter: formData.twitter || null,
        logo_url: logoUrl,
        logo_storage_path: logoStoragePath,
      }

      if (pkmInfo) {
        const { error: updateError } = await supabase.from('pkm_info').update(payload).eq('id', pkmInfo.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('pkm_info').insert(payload)
        if (insertError) throw insertError
      }

      setSuccess(true)
      setLogoFile(null)
      void loadPKMInfo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil PKM')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <main className="auth-shell"><p className="auth-loading">Memuat profil PKM…</p></main>

  return <section className="master-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">PROFIL PKM</p>
        <h1>Informasi PKM</h1>
        <p>Kelola informasi PKM dan logo untuk tampilan aplikasi dan laporan.</p>
      </div>
    </div>

    <div className="form-actions" style={{ marginBottom: '16px' }}>
      <button className="secondary" onClick={() => window.location.reload()} type="button">Kembali</button>
    </div>

    {success && <div className="saved-note" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>Profil PKM berhasil diperbarui!</div>}
    {error && <div className="error-message">{error}</div>}

    <div className="form-section" style={{ maxWidth: '800px' }}>
      <form onSubmit={handleSubmit}>
        <div className="filter-grid cols-2" style={{ marginTop: '24px' }}>
          <label className="wide">Logo PKM
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
              {logoPreview && (
                <img 
                  src={logoPreview} 
                  alt="Logo PKM" 
                  style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid var(--line)', borderRadius: '8px' }}
                />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoChange}
                style={{ flex: 1 }}
              />
            </div>
          </label>
          
          <label>Nama PKM
            <input
              value={formData.namaPkm}
              onChange={(e) => setFormData({ ...formData, namaPkm: e.target.value })}
              required
            />
          </label>
          
          <label className="wide">Alamat PKM
            <textarea
              value={formData.alamatPkm}
              onChange={(e) => setFormData({ ...formData, alamatPkm: e.target.value })}
              rows={3}
              required
            />
          </label>
          
          <label>No. Telepon
            <input
              value={formData.noTelepon}
              onChange={(e) => setFormData({ ...formData, noTelepon: e.target.value })}
              required
              inputMode="tel"
            />
          </label>
          
          <label>Penanggung Jawab/Kesling
            <input
              value={formData.penanggungJawab}
              onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })}
              required
            />
          </label>
          
          <label>Website
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://"
            />
          </label>
          
          <label>Instagram
            <input
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder="@username"
            />
          </label>
          
          <label>Facebook
            <input
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              placeholder="Page name"
            />
          </label>
          
          <label>Twitter
            <input
              value={formData.twitter}
              onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
              placeholder="@username"
            />
          </label>
        </div>

        <div className="form-actions" style={{ marginTop: '24px' }}>
          <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
        </div>
      </form>
    </div>
  </section>
}

function LokasiPage({ kelurahan, rw, rt, locations, reloadLocations }: { kelurahan: Region[]; rw: Region[]; rt: Region[]; locations: Location[]; reloadLocations: () => Promise<void> }) {
  const [loading, setLoading] = useState(() => locations.length === 0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedKelurahanId, setSelectedKelurahanId] = useState('')
  const [selectedRwId, setSelectedRwId] = useState('')
  const [selectedRtId, setSelectedRtId] = useState('')
  // Fitur pencarian
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  
  useEffect(() => {
    let active = true
    async function refresh() {
      setLoading(true)
      try {
        await reloadLocations()
      } catch (err) {
        console.error('Unexpected error reloading locations:', err)
        setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        if (active) setLoading(false)
      }
    }
    void refresh()
    return () => { active = false }
  }, [reloadLocations])

  function openForm(location?: Location) {
    setEditing(location ?? null)
    setError('')
    if (location) {
      setSelectedKelurahanId(location.kelurahanId ?? '')
      setSelectedRwId(location.rwId ?? '')
      setSelectedRtId(location.rtId ?? '')
    } else {
      const defaultKelurahanId = kelurahan[0]?.id ?? ''
      const defaultRwId = rw.find((item) => item.kelurahanId === defaultKelurahanId)?.id ?? ''
      const defaultRtId = rt.find((item) => item.rwId === defaultRwId)?.id ?? ''
      setSelectedKelurahanId(defaultKelurahanId)
      setSelectedRwId(defaultRwId)
      setSelectedRtId(defaultRtId)
    }
    setFormOpen(true)
  }

  // Auto-load default kelurahan/rw/rt untuk form baru (tanpa perlu refresh manual)
  useEffect(() => {
    if (!formOpen) return
    if (editing) return
    if (selectedKelurahanId) return
    const defaultKelurahanId = kelurahan[0]?.id
    if (!defaultKelurahanId) return
    const defaultRwId = rw.find((item) => item.kelurahanId === defaultKelurahanId)?.id ?? ''
    const defaultRtId = rt.find((item) => item.rwId === defaultRwId)?.id ?? ''
    setSelectedKelurahanId(defaultKelurahanId)
    setSelectedRwId(defaultRwId)
    setSelectedRtId(defaultRtId)
  }, [formOpen, editing, selectedKelurahanId, kelurahan, rw, rt])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const data = new FormData(event.currentTarget)
    
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name: String(data.get('name') ?? '').trim(),
        code: String(data.get('code') ?? '').trim() || null,
        address: String(data.get('address') ?? '').trim() || null,
        kelurahan_id: selectedKelurahanId || null,
        rw_id: selectedRwId || null,
        rt_id: selectedRtId || null,
        latitude: data.get('latitude') ? parseFloat(String(data.get('latitude'))) : null,
        longitude: data.get('longitude') ? parseFloat(String(data.get('longitude'))) : null,
        description: String(data.get('description') ?? '').trim() || null,
      }

      if (editing) {
        const { error: updateError } = await supabase.from('locations').update(payload).eq('id', editing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('locations').insert(payload)
        if (insertError) throw insertError
      }

      setFormOpen(false)
      await reloadLocations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan lokasi')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(location: Location) {
    if (!window.confirm(`Hapus lokasi ${location.name}?`)) return
    if (!supabase) return

    const { error } = await supabase.from('locations').delete().eq('id', location.id)
    if (error) {
      window.alert(`Gagal menghapus lokasi: ${error.message}`)
      return
    }
    await reloadLocations()
  }

  const rwOptions = rw.filter((item) => item.kelurahanId === selectedKelurahanId)
  const rtOptions = rt.filter((item) => item.rwId === selectedRwId)

  // Logika filter lokasi
  const filteredLocations = locations.filter((location) => {
    // Filter berdasarkan kelurahan jika dipilih
    if (filterKelurahanId && location.kelurahanId !== filterKelurahanId) {
      return false
    }
    
    // Filter berdasarkan keyword pencarian jika ada
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      const locationName = (location.name || '').toLowerCase()
      const locationCode = (location.code || '').toLowerCase()
      const locationAddress = (location.address || '').toLowerCase()
      const kelurahanName = (kelurahan.find(k => k.id === location.kelurahanId)?.name || '').toLowerCase()
      
      // Cek apakah keyword ditemukan di salah satu field
      return locationName.includes(keyword) || 
             locationCode.includes(keyword) || 
             locationAddress.includes(keyword) || 
             kelurahanName.includes(keyword)
    }
    
    return true
  })

  function exportExcel() {
    if (filteredLocations.length === 0) {
      window.alert('Tidak ada data lokasi untuk diexport.')
      return
    }
    const header = ['No', 'Nama Lokasi', 'Kode', 'Alamat', 'Wilayah', 'Koordinat']
    const rows = filteredLocations.map((location, index) => {
      const wilayah =
        `${kelurahan.find((k) => k.id === location.kelurahanId)?.name || '-'}` +
        `${location.rwId ? ` · RW ${rw.find((r) => r.id === location.rwId)?.name || '-'}` : ''}` +
        `${location.rtId ? ` · RT ${rt.find((r) => r.id === location.rtId)?.name || '-'}` : ''}`
      const koordinat =
        location.latitude && location.longitude
          ? `${location.latitude}, ${location.longitude}`
          : '-'
      return [
        index + 1,
        location.name,
        location.code || '-',
        location.address || '-',
        wilayah,
        koordinat,
      ]
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({
      fileName: `lokasi_${today}.xlsx`,
      sheetName: 'Lokasi',
      header,
      rows,
    })
  }

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">DATA MASTER</p><h1>Data Lokasi</h1><p>Kelola lokasi untuk pemeriksaan air dan udara.</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button">Export Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Lokasi</button>
      </div>
    </div>

    {!formOpen && (
      <div className="region-form" style={{ padding: '16px', marginBottom: '18px' }}>
        <div className="region-form-fields" style={{ marginTop: 0, gap: '16px' }}>
          <label>
            Filter Kelurahan
            <select 
              value={filterKelurahanId} 
              onChange={(e) => setFilterKelurahanId(e.target.value)}
              style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
            >
              <option value="">Semua Kelurahan</option>
              {kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            Pencarian
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nama, kode, atau alamat lokasi..."
              style={{ width: '100%', marginTop: '4px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}
            />
          </label>
        </div>
        <div style={{ marginTop: '12px', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Menampilkan {filteredLocations.length} dari {locations.length} lokasi
        </div>
      </div>
    )}

    {formOpen && <form className="entry-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA MASTER</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Lokasi</h1>
          <p>Lengkapi data lokasi untuk pemeriksaan air dan udara.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <section className="form-section">
        <h2>Informasi Dasar</h2>
        <div className="form-grid">
          <label>Nama Lokasi *
            <input defaultValue={editing?.name} name="name" placeholder="Masukkan nama lokasi" required />
          </label>
          <label>Kode Lokasi
            <input defaultValue={editing?.code} name="code" placeholder="Kode unik lokasi (opsional)" />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Alamat</h2>
        <div className="form-grid">
          <label className="wide">Alamat Lengkap
            <textarea defaultValue={editing?.address} name="address" rows={2} placeholder="Masukkan alamat lengkap lokasi" />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Wilayah</h2>
        <div className="form-grid">
          <label>Kelurahan *
            <select name="kelurahanId" onChange={(event) => { setSelectedKelurahanId(event.target.value); setSelectedRwId(''); setSelectedRtId('') }} value={selectedKelurahanId} required>
              <option value="">Pilih kelurahan</option>
              {kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>RW *
            <select disabled={!selectedKelurahanId} name="rwId" onChange={(event) => setSelectedRwId(event.target.value)} value={selectedRwId} required>
              <option value="">Pilih RW</option>
              {rwOptions.map((item) => <option key={item.id} value={item.id}>RW {item.name}</option>)}
            </select>
          </label>
          <label>RT *
            <select disabled={!selectedRwId} name="rtId" onChange={(event) => setSelectedRtId(event.target.value)} value={selectedRtId} required>
              <option value="">Pilih RT</option>
              {rtOptions.map((item) => <option key={item.id} value={item.id}>RT {item.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Koordinat GPS</h2>
        <div className="form-grid">
          <label>Latitude
            <input type="number" step="any" defaultValue={editing?.latitude} name="latitude" placeholder="-6.917464" />
          </label>
          <label>Longitude
            <input type="number" step="any" defaultValue={editing?.longitude} name="longitude" placeholder="107.619123" />
          </label>
        </div>
        <small style={{ display: 'block', marginTop: '8px', color: 'var(--muted)' }}>
          Koordinat opsional. Gunakan format desimal (contoh: -6.917464, 107.619123)
        </small>
      </section>

      <section className="form-section">
        <h2>Deskripsi</h2>
        <div className="form-grid">
          <label className="wide">Deskripsi Lokasi
            <textarea defaultValue={editing?.description} name="description" rows={3} placeholder="Deskripsi tambahan tentang lokasi (opsional)" />
          </label>
        </div>
      </section>

      <div className="form-actions">
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    <div className="region-list">
      {loading ? <div className="empty-state"><span>♙</span><h2>Memuat data lokasi…</h2></div> : filteredLocations.length === 0 ? <div className="empty-state"><span>♙</span><h2>{locations.length === 0 ? 'Belum ada lokasi' : 'Tidak ada lokasi yang cocok dengan filter'}</h2><p>{locations.length === 0 ? 'Tambahkan lokasi untuk mulai melakukan pemeriksaan.' : 'Coba ubah filter atau kata kunci pencarian.'}</p></div> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Lokasi</th>
                <th>Kode</th>
                <th>Alamat</th>
                <th>Wilayah</th>
                <th>Koordinat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map((location, index) => (
                <tr key={location.id}>
                  <td>{index + 1}</td>
                  <td><strong>{location.name}</strong></td>
                  <td>{location.code || '-'}</td>
                  <td>{location.address || '-'}</td>
                  <td>
                    {kelurahan.find(k => k.id === location.kelurahanId)?.name || '-'}
                    {location.rwId && ` · RW ${rw.find(r => r.id === location.rwId)?.name || '-'}`}
                    {location.rtId && ` · RT ${rt.find(r => r.id === location.rtId)?.name || '-'}`}
                  </td>
                  <td>
                    {location.latitude && location.longitude 
                      ? `${location.latitude}, ${location.longitude}` 
                      : '-'}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="edit-button btn-edit" onClick={() => openForm(location)} type="button">Edit</button>
                      <button className="delete-button btn-delete" onClick={() => remove(location)} type="button">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </section>
}

function UjiAirPage({ profile, locations, kelurahan, waterTests, setWaterTests }: { 
  profile: UserProfile | null; 
  locations: Location[]; 
  kelurahan: Region[];
  waterTests: WaterQualityTest[];
  setWaterTests: (tests: WaterQualityTest[]) => void;
}) {
  const tests = waterTests
  const setTests = setWaterTests
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  // State untuk filter lokasi
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [filterStart, setFilterStart] = useState(defaultFilterStart)
  const [filterEnd, setFilterEnd] = useState(defaultFilterEnd)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter tests berdasarkan filter yang dipilih
  const filteredTests = tests.filter(test => {
    if (filterKelurahanId) {
      const location = locations.find(loc => loc.id === test.locationId)
      if (location?.kelurahanId !== filterKelurahanId) return false
    }
    if (!inISODateRange(test.testDate, filterStart, filterEnd)) return false
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const info = getLocationInfo(test.locationId)
      if (!info.name.toLowerCase().includes(query) && !info.kelurahanName.toLowerCase().includes(query) && !test.testDate.toLowerCase().includes(query)) return false
    }
    return true
  })
  const [editing, setEditing] = useState<WaterQualityTest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    locationId: '',
    testDate: new Date().toISOString().split('T')[0],
    waterTemperatureValue: '',
    waterTemperatureUnit: 'C' as 'K' | 'C' | 'F' | 'R',
    airTemperatureValue: '',
    airTemperatureUnit: 'C' as 'K' | 'C' | 'F' | 'R',
    tdsValue: '',
    turbidityValue: '',
    colorValue: '',
    odorValue: '',
    phValue: '',
    nitriteValue: '',
    nitrateValue: '',
    chromiumValue: '',
    ironValue: '',
    manganeseValue: '',
    chlorineValue: '',
    fluorideValue: '',
    aluminumValue: '',
    eColiValue: '',
    coliformValue: '',
    notes: '',
  })

  const ujiAirEntryFields: Array<{ key: keyof typeof formData; label: string }> = [
    { key: 'airTemperatureValue', label: 'Suhu Udara' },
    { key: 'waterTemperatureValue', label: 'Suhu Air' },
    { key: 'tdsValue', label: 'TDS (mg/L)' },
    { key: 'turbidityValue', label: 'Kekeruhan (NTU)' },
    // Warna & Bau sengaja dikecualikan: kolom deskriptif bebas (mis. "Jernih",
    // "Tidak berbau"), bukan angka/simbol.
    { key: 'phValue', label: 'pH' },
    { key: 'nitrateValue', label: 'Nitrat (mg/L)' },
    { key: 'nitriteValue', label: 'Nitrit (mg/L)' },
    { key: 'chromiumValue', label: 'Chromium (mg/L)' },
    { key: 'ironValue', label: 'Besi (mg/L)' },
    { key: 'manganeseValue', label: 'Mangan (mg/L)' },
    { key: 'chlorineValue', label: 'Chlorine (mg/L)' },
    { key: 'fluorideValue', label: 'Fluorida (mg/L)' },
    { key: 'aluminumValue', label: 'Aluminium (mg/L)' },
    { key: 'eColiValue', label: 'E-coli (MPN/100ml)' },
    { key: 'coliformValue', label: 'Coliform (MPN/100ml)' },
  ]

  function setValidatedUjiValue(key: keyof typeof formData, rawValue: string) {
    // Hapus spasi agar input konsisten (dan lebih mudah tervalidasi).
    const next = rawValue.replace(/\s+/g, '')
    if (!isUjiAirValueValid(next, 'partial')) return
    setFormData((prev) => ({ ...prev, [key]: next }))
  }

  // Helper function to get location name and kelurahan
  function getLocationInfo(locationId: string) {
    const location = locations.find(l => l.id === locationId)
    if (!location) return { name: 'Lokasi tidak ditemukan', kelurahanName: '-' }
    const kelurahanData = kelurahan.find(k => k.id === location.kelurahanId)
    return { 
      name: location.name, 
      kelurahanName: kelurahanData?.name || '-' 
    }
  }

  function exportExcel() {
    if (filteredTests.length === 0) {
      window.alert('Tidak ada data uji air untuk diexport.')
      return
    }
    const header = [
      'Tanggal Uji',
      'Lokasi',
      'Suhu Udara',
      'Suhu Air',
      'TDS',
      'Kekeruhan',
      'Warna',
      'Bau',
      'pH',
      'Nitrat',
      'Nitrit',
      'Chromium',
      'Besi',
      'Mangan',
      'Chlorine',
      'Fluorida',
      'Aluminium',
      'E-coli',
      'Coliform',
      'Catatan',
    ]
    const rows = filteredTests.map((test) => {
      const info = getLocationInfo(test.locationId)
      const lokasiCell = info.kelurahanName ? `${info.name}\n${info.kelurahanName}` : info.name
      return [
        test.testDate,
        lokasiCell,
        formatWaterValue(test.airTemperatureValue, test.airTemperatureUnit),
        formatWaterValue(test.waterTemperatureValue, test.waterTemperatureUnit),
        formatWaterValue(test.tdsValue),
        formatWaterValue(test.turbidityValue),
        formatWaterValue(test.colorValue),
        formatWaterValue(test.odorValue),
        formatWaterValue(test.phValue),
        formatWaterValue(test.nitrateValue),
        formatWaterValue(test.nitriteValue),
        formatWaterValue(test.chromiumValue),
        formatWaterValue(test.ironValue),
        formatWaterValue(test.manganeseValue),
        formatWaterValue(test.chlorineValue),
        formatWaterValue(test.fluorideValue),
        formatWaterValue(test.aluminumValue),
        formatWaterValue(test.eColiValue),
        formatWaterValue(test.coliformValue),
        formatWaterValue(test.notes),
      ]
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({
      fileName: `uji_air_${today}.xlsx`,
      sheetName: 'Uji Air',
      header,
      rows,
    })
  }

  function getDefaultLocationId() {
    if (locations.length === 0) return ''
    const preferred = profile?.kelurahanId
      ? locations.find((l) => l.kelurahanId === profile.kelurahanId)
      : undefined
    return (preferred ?? locations[0]).id
  }

  async function loadTests() {
    if (!supabase || !profile) {
      console.error('Supabase or profile not available for water quality tests')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      console.log('Loading water quality tests for officer:', profile.id)
      let waterQuery = supabase.from('water_quality_tests').select('*')
      if (profile.role === 'kader') waterQuery = waterQuery.eq('officer_id', profile.id)
      const { data, error: loadError } = await waterQuery.order('test_date', { ascending: false })
      console.log('Load water quality tests result:', { data, error: loadError?.message, dataLength: data?.length })
      
      if (loadError) {
        console.error('Error loading water quality tests:', loadError)
        setError(`Gagal memuat data uji air: ${loadError.message}`)
        setLoading(false)
        return
      }
      
      if (!data || data.length === 0) {
        console.log('No water quality tests found')
        setTests([])
        setLoading(false)
        return
      }
      
      setTests((data as WaterQualityTestRow[]).map(mapWaterQualityTestRow))
      console.log('Water quality tests loaded successfully:', data.length)
    } catch (err) {
      console.error('Unexpected error in loadTests:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Load tests when profile is available (locations not required for fetching by officer_id)
  useEffect(() => {
    if (profile) {
      void loadTests()
    } else {
      setLoading(false)
    }
  }, [profile])

  function openForm(test?: WaterQualityTest) {
    setEditing(test ?? null)
    setError('')
    if (test) {
      setFormData({
        locationId: test.locationId,
        testDate: test.testDate,
        // Handle both new and old structure - if waterTemperatureValue doesn't exist, it might be in temperatureValue
        waterTemperatureValue: test.waterTemperatureValue?.toString() || (test as any).temperatureValue?.toString() || '',
        waterTemperatureUnit: test.waterTemperatureUnit || (test as any).temperatureUnit || 'C',
        airTemperatureValue: test.airTemperatureValue?.toString() || '',
        airTemperatureUnit: test.airTemperatureUnit || 'C',
        tdsValue: test.tdsValue?.toString() || '',
        turbidityValue: test.turbidityValue?.toString() || '',
        colorValue: test.colorValue || '',
        odorValue: test.odorValue || '',
        phValue: test.phValue?.toString() || '',
        nitriteValue: test.nitriteValue?.toString() || '',
        nitrateValue: test.nitrateValue?.toString() || '',
        chromiumValue: test.chromiumValue?.toString() || '',
        ironValue: test.ironValue?.toString() || '',
        manganeseValue: test.manganeseValue?.toString() || '',
        chlorineValue: test.chlorineValue?.toString() || '',
        fluorideValue: test.fluorideValue?.toString() || '',
        aluminumValue: test.aluminumValue?.toString() || '',
        eColiValue: test.eColiValue?.toString() || '',
        coliformValue: test.coliformValue?.toString() || '',
        notes: test.notes || '',
      })
    } else {
      setFormData({
        locationId: getDefaultLocationId(),
        testDate: new Date().toISOString().split('T')[0],
        waterTemperatureValue: '',
        waterTemperatureUnit: 'C',
        airTemperatureValue: '',
        airTemperatureUnit: 'C',
        tdsValue: '',
        turbidityValue: '',
        colorValue: '',
        odorValue: '',
        phValue: '',
        nitriteValue: '',
        nitrateValue: '',
        chromiumValue: '',
        ironValue: '',
        manganeseValue: '',
        chlorineValue: '',
        fluorideValue: '',
        aluminumValue: '',
        eColiValue: '',
        coliformValue: '',
        notes: '',
      })
    }
    setFormOpen(true)
  }

  // Pastikan `lokasi` auto-terisi saat daftar lokasi selesai ter-load (tanpa refresh manual).
  useEffect(() => {
    if (!formOpen) return
    if (editing) return
    if (formData.locationId) return
    const defaultId = getDefaultLocationId()
    if (!defaultId) return
    setFormData((prev) => ({ ...prev, locationId: defaultId }))
  }, [formOpen, editing, formData.locationId, locations, profile?.kelurahanId])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    
    setSubmitting(true)
    setError('')

    // Validation: Check if all required fields are filled
    if (!formData.locationId) {
      setError('Lokasi harus dipilih')
      setSubmitting(false)
      return
    }
    if (!formData.testDate) {
      setError('Tanggal uji harus diisi')
      setSubmitting(false)
      return
    }

    // Validasi input kolom entry (kecuali Catatan): hanya angka atau simbol matematika (<, >, =, +, -, /, koma, titik)
    for (const field of ujiAirEntryFields) {
      const value = String(formData[field.key] ?? '')
      if (!isUjiAirValueValid(value, 'final')) {
        setError(`Nilai ${field.label} hanya boleh berupa angka atau simbol (<, >, =, +, -, /, koma, titik).`)
        setSubmitting(false)
        return
      }
    }

    try {
      // Try with new column structure first
      // Warna/Bau/Catatan = teks bebas; kolom ukur = angka/simbol (sudah divalidasi di atas).
      const basePayload = {
        location_id: formData.locationId,
        test_date: formData.testDate,
        water_temperature_value: toDbUjiAirValue(formData.waterTemperatureValue),
        water_temperature_unit: formData.waterTemperatureUnit,
        air_temperature_value: toDbUjiAirValue(formData.airTemperatureValue),
        air_temperature_unit: formData.airTemperatureUnit,
        tds_value: toDbUjiAirValue(formData.tdsValue),
        turbidity_value: toDbUjiAirValue(formData.turbidityValue),
        color_value: toDbTextValue(formData.colorValue),
        odor_value: toDbTextValue(formData.odorValue),
        ph_value: toDbUjiAirValue(formData.phValue),
        nitrite_value: toDbUjiAirValue(formData.nitriteValue),
        nitrate_value: toDbUjiAirValue(formData.nitrateValue),
        chromium_value: toDbUjiAirValue(formData.chromiumValue),
        iron_value: toDbUjiAirValue(formData.ironValue),
        manganese_value: toDbUjiAirValue(formData.manganeseValue),
        chlorine_value: toDbUjiAirValue(formData.chlorineValue),
        fluoride_value: toDbUjiAirValue(formData.fluorideValue),
        aluminum_value: toDbUjiAirValue(formData.aluminumValue),
        e_coli_value: toDbUjiAirValue(formData.eColiValue),
        coliform_value: toDbUjiAirValue(formData.coliformValue),
        notes: toDbTextValue(formData.notes),
      }
      // officer_id hanya di-set saat insert; saat edit pertahankan pemilik asli
      // agar edit oleh admin tidak mencuri kepemilikan data.
      let payload = editing ? basePayload : { ...basePayload, officer_id: profile.id }

      let result
      if (editing) {
        result = await supabase.from('water_quality_tests').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('water_quality_tests').insert(payload)
      }

      // If new columns don't exist, fall back to old structure
      if (result.error && result.error.message.includes('column') && result.error.message.includes('does not exist')) {
        console.log('New columns not found, using fallback to old structure')
        
        // Fallback to old column structure for backward compatibility
        const fallbackBase: any = {
          location_id: formData.locationId,
          test_date: formData.testDate,
          temperature_value: toDbUjiAirValue(formData.waterTemperatureValue),
          temperature_unit: formData.waterTemperatureUnit,
          tds_value: toDbUjiAirValue(formData.tdsValue),
          turbidity_value: toDbUjiAirValue(formData.turbidityValue),
          color_value: toDbTextValue(formData.colorValue),
          odor_value: toDbTextValue(formData.odorValue),
          ph_value: toDbUjiAirValue(formData.phValue),
          nitrite_value: toDbUjiAirValue(formData.nitriteValue),
          nitrate_value: toDbUjiAirValue(formData.nitrateValue),
          chromium_value: toDbUjiAirValue(formData.chromiumValue),
          iron_value: toDbUjiAirValue(formData.ironValue),
          manganese_value: toDbUjiAirValue(formData.manganeseValue),
          chlorine_value: toDbUjiAirValue(formData.chlorineValue),
          fluoride_value: toDbUjiAirValue(formData.fluorideValue),
          aluminum_value: toDbUjiAirValue(formData.aluminumValue),
          e_coli_value: toDbUjiAirValue(formData.eColiValue),
          coliform_value: toDbUjiAirValue(formData.coliformValue),
          notes: toDbTextValue(formData.notes),
        }
        const fallbackPayload: any = editing ? fallbackBase : { ...fallbackBase, officer_id: profile.id }

        if (editing) {
          result = await supabase.from('water_quality_tests').update(fallbackPayload).eq('id', editing.id)
        } else {
          result = await supabase.from('water_quality_tests').insert(fallbackPayload)
        }
      }

      if (result.error) throw result.error

      setFormOpen(false)
      void loadTests()
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil uji')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(test: WaterQualityTest) {
    if (!window.confirm(`Hapus hasil uji tanggal ${test.testDate}?`)) return
    if (!supabase) return

    const { error } = await supabase.from('water_quality_tests').delete().eq('id', test.id)
    if (error) {
      window.alert(`Gagal menghapus hasil uji: ${error.message}`)
      return
    }
    void loadTests()
  }

  if (loading) return <section className="master-page"><div className="empty-state"><span>💧</span><h2>Memuat data uji air…</h2></div></section>

  // Nomor urut otomatis untuk field entry (tampil di form saja, tidak mengubah skema DB).
  let entryNo = 0
  const nextEntryNo = () => ++entryNo

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">PEMERIKSAAN</p><h1>Hasil Uji Pemeriksaan Air</h1><p>Kelola hasil uji kualitas air dari berbagai lokasi.</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button" disabled={tests.length === 0}>Export Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Uji Air</button>
      </div>
    </div>

    {formOpen && <form className="entry-form compact-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMERIKSAAN</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Uji Air</h1>
          <p>Lengkapi data hasil uji pemeriksaan air.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <section className="form-section">
        <h2>Informasi Uji</h2>
        <div className="form-grid">
          <label>Lokasi
            <select value={formData.locationId} onChange={(e) => setFormData({ ...formData, locationId: e.target.value })} required>
              <option value="">Pilih lokasi</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)' }}>
              Kelurahan: {getLocationInfo(formData.locationId).kelurahanName}
            </small>
          </label>
          <label>Tanggal
            <input type="date" value={formData.testDate} onChange={(e) => setFormData({ ...formData, testDate: e.target.value })} required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Fisik</h2>
        <div className="form-grid">
          <label><span className="entry-no">{nextEntryNo()}.</span> Suhu Udara
            <div className="inline-fields">
              <input type="text" inputMode="text" value={formData.airTemperatureValue} onChange={(e) => setValidatedUjiValue('airTemperatureValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." />
              <select value={formData.airTemperatureUnit} onChange={(e) => setFormData({ ...formData, airTemperatureUnit: e.target.value as 'K' | 'C' | 'F' | 'R' })}>
                <option value="K">K</option>
                <option value="C">C</option>
                <option value="F">F</option>
                <option value="R">R</option>
              </select>
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Suhu Air
            <div className="inline-fields">
              <input type="text" inputMode="text" value={formData.waterTemperatureValue} onChange={(e) => setValidatedUjiValue('waterTemperatureValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." />
              <select value={formData.waterTemperatureUnit} onChange={(e) => setFormData({ ...formData, waterTemperatureUnit: e.target.value as 'K' | 'C' | 'F' | 'R' })}>
                <option value="K">K</option>
                <option value="C">C</option>
                <option value="F">F</option>
                <option value="R">R</option>
              </select>
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> TDS (mg/L)<input value={formData.tdsValue} onChange={(e) => setValidatedUjiValue('tdsValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Kekeruhan (NTU)<input value={formData.turbidityValue} onChange={(e) => setValidatedUjiValue('turbidityValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Warna (TCU)<input value={formData.colorValue} onChange={(e) => setFormData({ ...formData, colorValue: e.target.value })} placeholder="Mis. Jernih, Keruh..." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Bau<input value={formData.odorValue} onChange={(e) => setFormData({ ...formData, odorValue: e.target.value })} placeholder="Mis. Tidak berbau..." /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Kimia</h2>
        <div className="form-grid">
          <label><span className="entry-no">{nextEntryNo()}.</span> pH<input value={formData.phValue} onChange={(e) => setValidatedUjiValue('phValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Nitrat (mg/L)<input value={formData.nitrateValue} onChange={(e) => setValidatedUjiValue('nitrateValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Nitrit (mg/L)<input value={formData.nitriteValue} onChange={(e) => setValidatedUjiValue('nitriteValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Chromium (mg/L)<input value={formData.chromiumValue} onChange={(e) => setValidatedUjiValue('chromiumValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Besi (mg/L)<input value={formData.ironValue} onChange={(e) => setValidatedUjiValue('ironValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Mangan (mg/L)<input value={formData.manganeseValue} onChange={(e) => setValidatedUjiValue('manganeseValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Chlorine (mg/L)<input value={formData.chlorineValue} onChange={(e) => setValidatedUjiValue('chlorineValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Fluorida (mg/L)<input value={formData.fluorideValue} onChange={(e) => setValidatedUjiValue('fluorideValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Aluminium (mg/L)<input value={formData.aluminumValue} onChange={(e) => setValidatedUjiValue('aluminumValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Mikrobiologi</h2>
        <div className="form-grid">
          <label><span className="entry-no">{nextEntryNo()}.</span> E-coli (MPN/100ml)<input value={formData.eColiValue} onChange={(e) => setValidatedUjiValue('eColiValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Coliform (MPN/100ml)<input value={formData.coliformValue} onChange={(e) => setValidatedUjiValue('coliformValue', e.target.value)} placeholder="Angka/simbol: < > = + - / , ." /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Catatan</h2>
        <div className="form-grid">
          <label className="wide"><span className="entry-no">{nextEntryNo()}.</span> Catatan<textarea className="notes-textarea" style={{ width: '100%', minHeight: '120px', height: '120px' }} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={5} placeholder="Catatan (bebas)..." /></label>
        </div>
      </section>

      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    {!formOpen && tests.length === 0 && <div className="empty-state"><span>💧</span><h2>Belum ada data uji air</h2><p>Klik tombol di atas untuk menambahkan hasil uji air baru.</p></div>}

    {!formOpen && tests.length > 0 && (
      <>
        {/* Filter Lokasi, Tanggal & Pencarian */}
        <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="filter-grid cols-3" style={{ gap: '16px', margin: 0 }}>
            <label>Filter Kelurahan
              <select 
                value={filterKelurahanId} 
                onChange={(e) => { 
                  setFilterKelurahanId(e.target.value)
                }}
              >
                <option value="">Semua Kelurahan</option>
                {kelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </label>
            <label>Tanggal Awal
              <input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
              />
            </label>
            <label>Tanggal Akhir
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                min={filterStart || undefined}
              />
            </label>
            <label className="span-all">Pencarian
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari lokasi, kelurahan, atau tanggal..." 
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="secondary" 
                onClick={() => { setFilterKelurahanId(''); setFilterStart(defaultFilterStart()); setFilterEnd(defaultFilterEnd()); setSearchQuery('') }}
                style={{ width: '100%' }}
              >
                Reset Filter
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Menampilkan {filteredTests.length} dari {tests.length} data</span>
            </div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table uji-air-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>No</th>
              <th>Tanggal Uji</th>
              <th>Lokasi</th>
              <th>Suhu Udara</th>
              <th>Suhu Air</th>
              <th>TDS</th>
              <th>Kekeruhan</th>
              <th>Warna</th>
              <th>Bau</th>
              <th>pH</th>
              <th>Nitrat</th>
              <th>Nitrit</th>
              <th>Chromium</th>
              <th>Besi</th>
              <th>Mangan</th>
              <th>Chlorine</th>
              <th>Fluorida</th>
              <th>Aluminium</th>
              <th>E-coli</th>
              <th>Coliform</th>
              <th>Catatan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length === 0 && (
              <tr><td colSpan={23} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>Tidak ada data pada periode/filter yang dipilih. Ubah filter tanggal atau klik Reset Filter.</td></tr>
            )}
            {filteredTests.map((test, index) => {
              const locationInfo = getLocationInfo(test.locationId)
              return (
                <tr key={test.id}>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{index + 1}</td>
                  <td>{test.testDate}</td>
                  <td><strong>{locationInfo.name}</strong>{locationInfo.kelurahanName && <> <br /><small>{locationInfo.kelurahanName}</small></>}</td>
                  <td className={isEmptyUjiAirValue(test.airTemperatureValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.airTemperatureValue, test.airTemperatureUnit)}</td>
                  <td className={isEmptyUjiAirValue(test.waterTemperatureValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.waterTemperatureValue, test.waterTemperatureUnit)}</td>
                  <td className={isEmptyUjiAirValue(test.tdsValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.tdsValue)}</td>
                  <td className={isEmptyUjiAirValue(test.turbidityValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.turbidityValue)}</td>
                  <td className={isEmptyUjiAirValue(test.colorValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.colorValue)}</td>
                  <td className={isEmptyUjiAirValue(test.odorValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.odorValue)}</td>
                  <td className={isEmptyUjiAirValue(test.phValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.phValue)}</td>
                  <td className={isEmptyUjiAirValue(test.nitrateValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.nitrateValue)}</td>
                  <td className={isEmptyUjiAirValue(test.nitriteValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.nitriteValue)}</td>
                  <td className={isEmptyUjiAirValue(test.chromiumValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.chromiumValue)}</td>
                  <td className={isEmptyUjiAirValue(test.ironValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.ironValue)}</td>
                  <td className={isEmptyUjiAirValue(test.manganeseValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.manganeseValue)}</td>
                  <td className={isEmptyUjiAirValue(test.chlorineValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.chlorineValue)}</td>
                  <td className={isEmptyUjiAirValue(test.fluorideValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.fluorideValue)}</td>
                  <td className={isEmptyUjiAirValue(test.aluminumValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.aluminumValue)}</td>
                  <td className={isEmptyUjiAirValue(test.eColiValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.eColiValue)}</td>
                  <td className={isEmptyUjiAirValue(test.coliformValue) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.coliformValue)}</td>
                  <td className={isEmptyUjiAirValue(test.notes) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.notes)}</td>
                  <td>
                    <div className="entry-actions">
                      <button className="text-button btn-edit" onClick={() => openForm(test)} type="button">Edit</button>
                      <button className="text-button btn-delete" onClick={() => remove(test)} type="button">Hapus</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      </>
    )}
  </section>
}

function UjiUdaraPage({ profile, locations, kelurahan, airTests, setAirTests }: { 
  profile: UserProfile | null; 
  locations: Location[]; 
  kelurahan: Region[];
  airTests: AirQualityTest[];
  setAirTests: (tests: AirQualityTest[]) => void;
}) {
  const tests = airTests
  const setTests = setAirTests
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AirQualityTest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // State untuk filter lokasi
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [filterStart, setFilterStart] = useState(defaultFilterStart)
  const [filterEnd, setFilterEnd] = useState(defaultFilterEnd)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter tests berdasarkan filter yang dipilih
  const filteredTests = tests.filter(test => {
    if (filterKelurahanId) {
      const location = locations.find(loc => loc.id === test.locationId)
      if (location?.kelurahanId !== filterKelurahanId) return false
    }
    if (!inISODateRange(test.testDate, filterStart, filterEnd)) return false
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const info = getLocationInfo(test.locationId)
      if (!info.name.toLowerCase().includes(query) && !info.kelurahanName.toLowerCase().includes(query) && !test.testDate.toLowerCase().includes(query)) return false
    }
    return true
  })

  const [formData, setFormData] = useState({
    locationId: '',
    testDate: new Date().toISOString().split('T')[0],
    temperature1: '', temperature2: '', temperature3: '',
    temperatureUnit: 'C' as 'K' | 'C' | 'F' | 'R',
    humidity1: '', humidity2: '', humidity3: '',
    noise1: '', noise2: '', noise3: '',
    lighting1: '', lighting2: '', lighting3: '',
    pm25_1: '', pm25_2: '', pm25_3: '',
    pm10_1: '', pm10_2: '', pm10_3: '',
    ventilationRate1: '', ventilationRate2: '', ventilationRate3: '',
    notes: '',
  })

  // Helper function to get location name and kelurahan
  function getLocationInfo(locationId: string) {
    const location = locations.find(l => l.id === locationId)
    if (!location) return { name: 'Lokasi tidak ditemukan', kelurahanName: '-' }
    const kelurahanData = kelurahan.find(k => k.id === location.kelurahanId)
    return { 
      name: location.name, 
      kelurahanName: kelurahanData?.name || '-' 
    }
  }

  function exportExcel() {
    if (filteredTests.length === 0) {
      window.alert('Tidak ada data uji udara untuk diexport.')
      return
    }
    const header = [
      'No',
      'Tanggal Uji',
      'Lokasi',
      'Suhu 1/2/3',
      'Kelembapan 1/2/3',
      'Kebisingan 1/2/3',
      'Pencahayaan 1/2/3',
      'PM 2.5 1/2/3',
      'PM 10 1/2/3',
      'Ventilasi 1/2/3',
    ]
    const rows = filteredTests.map((test, index) => {
      const info = getLocationInfo(test.locationId)
      const lokasiCell = info.kelurahanName ? `${info.name}\n${info.kelurahanName}` : info.name
      return [
        index + 1,
        test.testDate,
        lokasiCell,
        `${test.temperature1 || 0}/${test.temperature2 || 0}/${test.temperature3 || 0}`,
        `${test.humidity1 || 0}/${test.humidity2 || 0}/${test.humidity3 || 0}`,
        `${test.noise1 || 0}/${test.noise2 || 0}/${test.noise3 || 0}`,
        `${test.lighting1 || 0}/${test.lighting2 || 0}/${test.lighting3 || 0}`,
        `${test.pm25_1 || 0}/${test.pm25_2 || 0}/${test.pm25_3 || 0}`,
        `${test.pm10_1 || 0}/${test.pm10_2 || 0}/${test.pm10_3 || 0}`,
        `${test.ventilationRate1 || 0}/${test.ventilationRate2 || 0}/${test.ventilationRate3 || 0}`,
      ]
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({
      fileName: `uji_udara_${today}.xlsx`,
      sheetName: 'Uji Udara',
      header,
      rows,
    })
  }

  function getDefaultLocationId() {
    if (locations.length === 0) return ''
    const preferred = profile?.kelurahanId
      ? locations.find((l) => l.kelurahanId === profile.kelurahanId)
      : undefined
    return (preferred ?? locations[0]).id
  }

  async function loadTests() {
    if (!supabase || !profile) {
      console.error('Supabase or profile not available for air quality tests')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      console.log('Loading air quality tests for officer:', profile.id)
      let airQuery = supabase.from('air_quality_tests').select('*')
      if (profile.role === 'kader') airQuery = airQuery.eq('officer_id', profile.id)
      const { data, error: loadError } = await airQuery.order('test_date', { ascending: false })
      console.log('Load air quality tests result:', { data, error: loadError?.message, dataLength: data?.length })
      
      if (loadError) {
        console.error('Error loading air quality tests:', loadError)
        setError(`Gagal memuat data uji udara: ${loadError.message}`)
        setLoading(false)
        return
      }
      
      if (!data || data.length === 0) {
        console.log('No air quality tests found')
        setTests([])
        setLoading(false)
        return
      }
      
      setTests((data as AirQualityTestRow[]).map(mapAirQualityTestRow))
      console.log('Air quality tests loaded successfully:', data.length)
    } catch (err) {
      console.error('Unexpected error in loadTests:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Load tests when profile is available (locations not required for fetching by officer_id)
  useEffect(() => {
    if (profile) {
      void loadTests()
    } else {
      setLoading(false)
    }
  }, [profile])

  function openForm(test?: AirQualityTest) {
    setEditing(test ?? null)
    setError('')
    if (test) {
      setFormData({
        locationId: test.locationId,
        testDate: test.testDate,
        temperature1: test.temperature1?.toString() || '',
        temperature2: test.temperature2?.toString() || '',
        temperature3: test.temperature3?.toString() || '',
        temperatureUnit: test.temperatureUnit,
        humidity1: test.humidity1?.toString() || '',
        humidity2: test.humidity2?.toString() || '',
        humidity3: test.humidity3?.toString() || '',
        noise1: test.noise1?.toString() || '',
        noise2: test.noise2?.toString() || '',
        noise3: test.noise3?.toString() || '',
        lighting1: test.lighting1?.toString() || '',
        lighting2: test.lighting2?.toString() || '',
        lighting3: test.lighting3?.toString() || '',
        pm25_1: test.pm25_1?.toString() || '',
        pm25_2: test.pm25_2?.toString() || '',
        pm25_3: test.pm25_3?.toString() || '',
        pm10_1: test.pm10_1?.toString() || '',
        pm10_2: test.pm10_2?.toString() || '',
        pm10_3: test.pm10_3?.toString() || '',
        ventilationRate1: test.ventilationRate1?.toString() || '',
        ventilationRate2: test.ventilationRate2?.toString() || '',
        ventilationRate3: test.ventilationRate3?.toString() || '',
        notes: test.notes || '',
      })
    } else {
      setFormData({
        locationId: getDefaultLocationId(),
        testDate: new Date().toISOString().split('T')[0],
        temperature1: '', temperature2: '', temperature3: '',
        temperatureUnit: 'C',
        humidity1: '', humidity2: '', humidity3: '',
        noise1: '', noise2: '', noise3: '',
        lighting1: '', lighting2: '', lighting3: '',
        pm25_1: '', pm25_2: '', pm25_3: '',
        pm10_1: '', pm10_2: '', pm10_3: '',
        ventilationRate1: '', ventilationRate2: '', ventilationRate3: '',
        notes: '',
      })
    }
    setFormOpen(true)
  }

  // Pastikan `lokasi` auto-terisi saat daftar lokasi selesai ter-load (tanpa refresh manual).
  useEffect(() => {
    if (!formOpen) return
    if (editing) return
    if (formData.locationId) return
    const defaultId = getDefaultLocationId()
    if (!defaultId) return
    setFormData((prev) => ({ ...prev, locationId: defaultId }))
  }, [formOpen, editing, formData.locationId, locations, profile?.kelurahanId])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    
    setSubmitting(true)
    setError('')

    // Validation: Check if all required fields are filled
    if (!formData.locationId) {
      setError('Lokasi harus dipilih')
      setSubmitting(false)
      return
    }
    if (!formData.testDate) {
      setError('Tanggal uji harus diisi')
      setSubmitting(false)
      return
    }

    try {
      const numericFields: Array<{ key: string; label: string; value: string }> = [
        { key: 'temperature_1', label: 'Suhu 1', value: formData.temperature1 },
        { key: 'temperature_2', label: 'Suhu 2', value: formData.temperature2 },
        { key: 'temperature_3', label: 'Suhu 3', value: formData.temperature3 },
        { key: 'humidity_1', label: 'Kelembapan 1', value: formData.humidity1 },
        { key: 'humidity_2', label: 'Kelembapan 2', value: formData.humidity2 },
        { key: 'humidity_3', label: 'Kelembapan 3', value: formData.humidity3 },
        { key: 'noise_1', label: 'Kebisingan 1', value: formData.noise1 },
        { key: 'noise_2', label: 'Kebisingan 2', value: formData.noise2 },
        { key: 'noise_3', label: 'Kebisingan 3', value: formData.noise3 },
        { key: 'lighting_1', label: 'Pencahayaan 1', value: formData.lighting1 },
        { key: 'lighting_2', label: 'Pencahayaan 2', value: formData.lighting2 },
        { key: 'lighting_3', label: 'Pencahayaan 3', value: formData.lighting3 },
        { key: 'pm25_1', label: 'PM 2.5 ke-1', value: formData.pm25_1 },
        { key: 'pm25_2', label: 'PM 2.5 ke-2', value: formData.pm25_2 },
        { key: 'pm25_3', label: 'PM 2.5 ke-3', value: formData.pm25_3 },
        { key: 'pm10_1', label: 'PM 10 ke-1', value: formData.pm10_1 },
        { key: 'pm10_2', label: 'PM 10 ke-2', value: formData.pm10_2 },
        { key: 'pm10_3', label: 'PM 10 ke-3', value: formData.pm10_3 },
        { key: 'ventilation_rate_1', label: 'Ventilasi 1', value: formData.ventilationRate1 },
        { key: 'ventilation_rate_2', label: 'Ventilasi 2', value: formData.ventilationRate2 },
        { key: 'ventilation_rate_3', label: 'Ventilasi 3', value: formData.ventilationRate3 },
      ]
      const parsed: Record<string, number | null> = {}
      for (const field of numericFields) {
        const result = parseUjiUdaraNumber(field.value)
        if (result === 'invalid') {
          setError(`Nilai ${field.label} harus berupa angka (koma desimal boleh, mis. 25,5).`)
          setSubmitting(false)
          return
        }
        parsed[field.key] = result
      }
      const basePayload = {
        location_id: formData.locationId,
        test_date: formData.testDate,
        temperature_1: parsed.temperature_1,
        temperature_2: parsed.temperature_2,
        temperature_3: parsed.temperature_3,
        temperature_unit: formData.temperatureUnit,
        humidity_1: parsed.humidity_1,
        humidity_2: parsed.humidity_2,
        humidity_3: parsed.humidity_3,
        noise_1: parsed.noise_1,
        noise_2: parsed.noise_2,
        noise_3: parsed.noise_3,
        lighting_1: parsed.lighting_1,
        lighting_2: parsed.lighting_2,
        lighting_3: parsed.lighting_3,
        pm25_1: parsed.pm25_1,
        pm25_2: parsed.pm25_2,
        pm25_3: parsed.pm25_3,
        pm10_1: parsed.pm10_1,
        pm10_2: parsed.pm10_2,
        pm10_3: parsed.pm10_3,
        ventilation_rate_1: parsed.ventilation_rate_1,
        ventilation_rate_2: parsed.ventilation_rate_2,
        ventilation_rate_3: parsed.ventilation_rate_3,
        notes: formData.notes || null,
      }
      // officer_id hanya di-set saat insert; saat edit pertahankan pemilik asli.
      const payload = editing ? basePayload : { ...basePayload, officer_id: profile.id }

      let result
      if (editing) {
        result = await supabase.from('air_quality_tests').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('air_quality_tests').insert(payload)
      }

      if (result.error) throw result.error

      setFormOpen(false)
      void loadTests()
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil uji')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(test: AirQualityTest) {
    if (!window.confirm(`Hapus hasil uji tanggal ${test.testDate}?`)) return
    if (!supabase) return

    const { error } = await supabase.from('air_quality_tests').delete().eq('id', test.id)
    if (error) {
      window.alert(`Gagal menghapus hasil uji: ${error.message}`)
      return
    }
    void loadTests()
  }

  if (loading) return <section className="master-page"><div className="empty-state"><span>🌬️</span><h2>Memuat data uji udara…</h2></div></section>

  // Nomor urut otomatis untuk field entry (tampil di form saja, tidak mengubah skema DB).
  let entryNo = 0
  const nextEntryNo = () => ++entryNo

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">PEMERIKSAAN</p><h1>Hasil Uji Kualitas Udara</h1><p>Kelola hasil uji kualitas udara dari berbagai lokasi.</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button" disabled={tests.length === 0}>Export Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Uji Udara</button>
      </div>
    </div>

    {formOpen && <form className="entry-form compact-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMERIKSAAN</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Uji Udara</h1>
          <p>Lengkapi data hasil uji kualitas udara.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <section className="form-section">
        <h2>Informasi Uji</h2>
        <div className="form-grid">
          <label>Lokasi
            <select value={formData.locationId} onChange={(e) => setFormData({ ...formData, locationId: e.target.value })} required>
              <option value="">Pilih lokasi</option>
              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
            <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)' }}>
              Kelurahan: {getLocationInfo(formData.locationId).kelurahanName}
            </small>
          </label>
          <label>Tanggal
            <input type="date" value={formData.testDate} onChange={(e) => setFormData({ ...formData, testDate: e.target.value })} required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Parameter Udara</h2>
        <div className="form-grid">
          <label><span className="entry-no">{nextEntryNo()}.</span> Suhu (°C)
            <div className="inline-fields">
              <input value={formData.temperature1} onChange={(e) => setFormData({ ...formData, temperature1: e.target.value })} placeholder="1" />
              <input value={formData.temperature2} onChange={(e) => setFormData({ ...formData, temperature2: e.target.value })} placeholder="2" />
              <input value={formData.temperature3} onChange={(e) => setFormData({ ...formData, temperature3: e.target.value })} placeholder="3" />
              <select value={formData.temperatureUnit} onChange={(e) => setFormData({ ...formData, temperatureUnit: e.target.value as 'K' | 'C' | 'F' | 'R' })}>
                <option value="K">K</option>
                <option value="C">C</option>
                <option value="F">F</option>
                <option value="R">R</option>
              </select>
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Kelembapan (%)
            <div className="inline-fields">
              <input value={formData.humidity1} onChange={(e) => setFormData({ ...formData, humidity1: e.target.value })} placeholder="1" />
              <input value={formData.humidity2} onChange={(e) => setFormData({ ...formData, humidity2: e.target.value })} placeholder="2" />
              <input value={formData.humidity3} onChange={(e) => setFormData({ ...formData, humidity3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Kebisingan (dB)
            <div className="inline-fields">
              <input value={formData.noise1} onChange={(e) => setFormData({ ...formData, noise1: e.target.value })} placeholder="1" />
              <input value={formData.noise2} onChange={(e) => setFormData({ ...formData, noise2: e.target.value })} placeholder="2" />
              <input value={formData.noise3} onChange={(e) => setFormData({ ...formData, noise3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Pencahayaan (lux)
            <div className="inline-fields">
              <input value={formData.lighting1} onChange={(e) => setFormData({ ...formData, lighting1: e.target.value })} placeholder="1" />
              <input value={formData.lighting2} onChange={(e) => setFormData({ ...formData, lighting2: e.target.value })} placeholder="2" />
              <input value={formData.lighting3} onChange={(e) => setFormData({ ...formData, lighting3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> PM 2.5 (µg/m³)
            <div className="inline-fields">
              <input value={formData.pm25_1} onChange={(e) => setFormData({ ...formData, pm25_1: e.target.value })} placeholder="1" />
              <input value={formData.pm25_2} onChange={(e) => setFormData({ ...formData, pm25_2: e.target.value })} placeholder="2" />
              <input value={formData.pm25_3} onChange={(e) => setFormData({ ...formData, pm25_3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> PM 10 (µg/m³)
            <div className="inline-fields">
              <input value={formData.pm10_1} onChange={(e) => setFormData({ ...formData, pm10_1: e.target.value })} placeholder="1" />
              <input value={formData.pm10_2} onChange={(e) => setFormData({ ...formData, pm10_2: e.target.value })} placeholder="2" />
              <input value={formData.pm10_3} onChange={(e) => setFormData({ ...formData, pm10_3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Ventilasi (m³/h)
            <div className="inline-fields">
              <input value={formData.ventilationRate1} onChange={(e) => setFormData({ ...formData, ventilationRate1: e.target.value })} placeholder="1" />
              <input value={formData.ventilationRate2} onChange={(e) => setFormData({ ...formData, ventilationRate2: e.target.value })} placeholder="2" />
              <input value={formData.ventilationRate3} onChange={(e) => setFormData({ ...formData, ventilationRate3: e.target.value })} placeholder="3" />
            </div>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Catatan</h2>
        <div className="form-grid">
          <label className="wide"><span className="entry-no">{nextEntryNo()}.</span> Catatan<textarea className="notes-textarea" style={{ width: '100%', minHeight: '120px', height: '120px' }} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={5} placeholder="Catatan..." /></label>
        </div>
      </section>

      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    {!formOpen && tests.length === 0 && <div className="empty-state"><span>🌬️</span><h2>Belum ada data uji udara</h2><p>Klik tombol di atas untuk menambahkan hasil uji udara baru.</p></div>}

    {!formOpen && tests.length > 0 && (
      <>
        {/* Filter Lokasi, Tanggal & Pencarian */}
        <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="filter-grid cols-3" style={{ gap: '16px', margin: 0 }}>
            <label>Filter Kelurahan
              <select 
                value={filterKelurahanId} 
                onChange={(e) => setFilterKelurahanId(e.target.value)}
              >
                <option value="">Semua Kelurahan</option>
                {kelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </label>
            <label>Tanggal Awal
              <input
                type="date"
                value={filterStart}
                onChange={(e) => setFilterStart(e.target.value)}
              />
            </label>
            <label>Tanggal Akhir
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => setFilterEnd(e.target.value)}
                min={filterStart || undefined}
              />
            </label>
            <label className="span-all">Pencarian
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari lokasi, kelurahan, atau tanggal..." 
              />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                className="secondary" 
                onClick={() => { setFilterKelurahanId(''); setFilterStart(defaultFilterStart()); setFilterEnd(defaultFilterEnd()); setSearchQuery('') }}
                style={{ width: '100%' }}
              >
                Reset Filter
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Menampilkan {filteredTests.length} dari {tests.length} data</span>
            </div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table uji-air-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>No</th>
              <th>Tanggal Uji</th>
              <th>Lokasi</th>
              <th>Suhu 1/2/3</th>
              <th>Kelembapan 1/2/3</th>
              <th>Kebisingan 1/2/3</th>
              <th>Pencahayaan 1/2/3</th>
              <th>PM 2.5 1/2/3</th>
              <th>PM 10 1/2/3</th>
              <th>Ventilasi 1/2/3</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>Tidak ada data pada periode/filter yang dipilih. Ubah filter tanggal atau klik Reset Filter.</td></tr>
            )}
            {filteredTests.map((test, index) => {
              const locationInfo = getLocationInfo(test.locationId)
              return (
              <tr key={test.id}>
                <td style={{ textAlign: 'center', fontWeight: '600' }}>{index + 1}</td>
                <td>{test.testDate}</td>
                <td><strong>{locationInfo.name}</strong>{locationInfo.kelurahanName && <> <br /><small>{locationInfo.kelurahanName}</small></>}</td>
                <td className={hasEmptyUjiUdaraValues([test.temperature1, test.temperature2, test.temperature3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.temperature1, test.temperature2, test.temperature3])}</td>
                <td className={hasEmptyUjiUdaraValues([test.humidity1, test.humidity2, test.humidity3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.humidity1, test.humidity2, test.humidity3])}</td>
                <td className={hasEmptyUjiUdaraValues([test.noise1, test.noise2, test.noise3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.noise1, test.noise2, test.noise3])}</td>
                <td className={hasEmptyUjiUdaraValues([test.lighting1, test.lighting2, test.lighting3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.lighting1, test.lighting2, test.lighting3])}</td>
                <td className={hasEmptyUjiUdaraValues([test.pm25_1, test.pm25_2, test.pm25_3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.pm25_1, test.pm25_2, test.pm25_3])}</td>
                <td className={hasEmptyUjiUdaraValues([test.pm10_1, test.pm10_2, test.pm10_3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.pm10_1, test.pm10_2, test.pm10_3])}</td>
                <td className={hasEmptyUjiUdaraValues([test.ventilationRate1, test.ventilationRate2, test.ventilationRate3]) ? 'uji-udara-empty-cell' : undefined}>{formatUjiUdaraValues([test.ventilationRate1, test.ventilationRate2, test.ventilationRate3])}</td>
                <td>
                  <div className="entry-actions">
                    <button className="text-button btn-edit" onClick={() => openForm(test)} type="button">Edit</button>
                    <button className="text-button btn-delete" onClick={() => remove(test)} type="button">Hapus</button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </>
    )}
  </section>
}

function LoginPage() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!supabase) { setError('Supabase belum dikonfigurasi.'); return }
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) setError('Email atau kata sandi salah.')
  }

  return <main className="auth-shell" style={{
    backgroundImage: 'url("/Aset/WhatsApp%20Image%202026-09-02%20at%201.21.00%20PM.jpeg")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative'
  }}>
    {/* Overlay gelap untuk meningkatkan keterbacaan form */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      zIndex: 0
    }}></div>
    <form className="auth-card" onSubmit={submit} style={{ position: 'relative', zIndex: 1 }}>
      <img className="brand-logo large" src="/Aset/logo-sigesit-mark.png" alt="Logo SIGESIT Sadakeling" />
      <h1>SIGESIT<span className="brand-sub">SADAKELING</span></h1>
      <p>Masuk untuk mengelola pendataan SIGESIT SADAKELING - KOTA CIMAHI.</p>
      {error && <div className="auth-error">{error}</div>}
      <label>Email<input autoComplete="username" name="email" required type="email" /></label>
      <label>
        Kata sandi
        <div style={{ position: 'relative' }}>
          <input 
            autoComplete="current-password" 
            name="password" 
            required 
            type={showPassword ? 'text' : 'password'} 
            style={{ paddingRight: '45px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><path d="M1 12s9-7 17-7 6 5 6 7-6 7-6 7"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s9-7 17-7 6 5 6 7-6 7-6 7"></path><circle cx="12" cy="12" r="3"></circle></svg>
            )}
          </button>
        </div>
      </label>
      <button className="primary" disabled={submitting} type="submit">{submitting ? 'Memproses…' : 'Masuk'}</button>
      <p className="auth-copy">Copyright : Januari 2026</p>
    </form>
  </main>
}

function PenggunaPage({ kelurahan, rw, rt, currentUserId }: { kelurahan: Region[]; rw: Region[]; rt: Region[]; currentUserId?: string }) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedKelurahanId, setSelectedKelurahanId] = useState('')
  const [selectedRwId, setSelectedRwId] = useState('')
  const [role, setRole] = useState<UserRole>('kader')
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess>(getDefaultModuleAccess('kader'))
  const [usernameDraft, setUsernameDraft] = useState('')
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  async function loadUsers() {
    if (!supabase) {
      console.error('Supabase client not available')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      console.log('Loading users from profiles...')
      const { data, error: loadError } = await supabase.from('profiles').select('*').order('full_name')
      console.log('Load users result:', { data, error: loadError?.message, dataLength: data?.length })
      
      if (loadError) {
        console.error('Error loading users:', loadError)
        setError(`Gagal memuat data pengguna: ${loadError.message}`)
        setLoading(false)
        return
      }
      
      if (!data || data.length === 0) {
        console.log('No users found in database')
        setUsers([])
        setLoading(false)
        return
      }
      
      setUsers((data as ProfileRow[]).map(mapProfileRow))
      console.log('Users loaded successfully:', data.length)
    } catch (err) {
      console.error('Unexpected error in loadUsers:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [])

  function generateUsername(nik: string): string {
    const last5Digits = nik.slice(-5)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let uniqueLetters = ''
    for (let i = 0; i < 3; i++) {
      uniqueLetters += letters.charAt(Math.floor(Math.random() * letters.length))
    }
    return last5Digits + uniqueLetters
  }

  // Must satisfy the backend password policy (upper, lower, digit, symbol), so guarantee
  // one character from each category before filling and shuffling the remainder.
  function generatePassword(): string {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*'
    const all = upper + lower + numbers + symbols
    const pick = (set: string) => set.charAt(Math.floor(Math.random() * set.length))
    const chars = [pick(upper), pick(lower), pick(numbers), pick(symbols)]
    while (chars.length < 12) chars.push(pick(all))
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = chars[i]
      chars[i] = chars[j]
      chars[j] = tmp
    }
    return chars.join('')
  }

  // Module access is fully derived from role: super_admin = all, kader = entry only,
  // admin = the modules toggled in the form (pengguna is never grantable to admin).
  function resolveModuleAccess(nextRole: UserRole, current: ModuleAccess): ModuleAccess {
    if (nextRole === 'super_admin') return getDefaultModuleAccess('super_admin')
    if (nextRole === 'kader') return getDefaultModuleAccess('kader')
    return { ...current, pengguna: false }
  }

  function changeRole(nextRole: UserRole) {
    setRole(nextRole)
    setModuleAccess((prev) => resolveModuleAccess(nextRole, prev))
  }

  function openForm(user?: UserProfile) {
    setEditing(user ?? null)
    setError('')
    setSelectedKelurahanId(user?.kelurahanId ?? '')
    setSelectedRwId(user?.rwId ?? '')
    const nextRole = user?.role ?? 'kader'
    setRole(nextRole)
    setModuleAccess(user ? resolveModuleAccess(nextRole, user.moduleAccess) : getDefaultModuleAccess(nextRole))
    setUsernameDraft(user?.username ?? '')
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const data = new FormData(event.currentTarget)
    const nik = String(data.get('nik') ?? '').trim()
    
    // NIK uniqueness validation
    if (!editing && nik) {
      const { data: existingUser, error: nikLookupError } = await supabase.from('profiles').select('id').eq('nik', nik).maybeSingle()
      if (nikLookupError) {
        setError(isUnauthenticated(nikLookupError.message, null) ? SESSION_HELP : `Gagal memeriksa NIK: ${nikLookupError.message}`)
        return
      }
      if (existingUser) {
        setError('NIK sudah terdaftar. Gunakan NIK yang berbeda.')
        return
      }
    }

    const username = editing ? usernameDraft.trim() : generateUsername(nik)
    if (!username) { setError('Username wajib diisi.'); return }

    // Username uniqueness validation when it is changed on edit
    if (editing && username !== editing.username) {
      const { data: duplicateUsername, error: usernameLookupError } = await supabase.from('profiles').select('id').eq('username', username).neq('id', editing.id).maybeSingle()
      if (usernameLookupError) {
        setError(isUnauthenticated(usernameLookupError.message, null) ? SESSION_HELP : `Gagal memeriksa username: ${usernameLookupError.message}`)
        return
      }
      if (duplicateUsername) {
        setError('Username sudah digunakan pengguna lain. Gunakan username yang berbeda.')
        return
      }
    }

    // On edit the password is optional (blank = keep current); on create it is auto-generated.
    let password = String(data.get('password') ?? '').trim()
    if (!editing) password = generatePassword()

    const payload = {
      action: editing ? 'update' : 'create',
      id: editing?.id,
      email: `${username}@sigesit.local`,
      password: password || undefined,
      fullName: String(data.get('fullName') ?? '').trim(),
      username: username,
      nik: nik,
      phone: String(data.get('phone') ?? '').trim(),
      role: role,
      kelurahanId: String(data.get('kelurahanId') ?? '') || undefined,
      rwId: String(data.get('rwId') ?? '') || undefined,
      rtId: String(data.get('rtId') ?? '') || undefined,
      isActive: data.get('isActive') === 'on',
      moduleAccess: resolveModuleAccess(role, moduleAccess),
    }

    setSubmitting(true)
    setError('')
    console.log('Sending payload to Edge Function:', payload)
    const { data: result, error: invokeError } = await invokeAdminUsers(payload)
    console.log('Edge Function response:', { result, invokeError: JSON.stringify(invokeError) })
    setSubmitting(false)
    const resultError = (result as { error?: string } | null)?.error
    const functionError = invokeError ? await getFunctionErrorMessage(invokeError) : null
    if (invokeError || resultError) { setError(resultError ?? functionError ?? 'Gagal menyimpan pengguna.'); return }
    
    if (!editing) {
      // Kredensial hanya ditampilkan sekali di sini; tidak disimpan ke database.
      // Show generated credentials
      alert(`User berhasil dibuat!\n\nUsername: ${username}\nPassword: ${password}\n\nSimpan credentials ini untuk user.`)
    }
    
    setFormOpen(false)
    setEditing(null)
    void loadUsers()
  }

  async function toggleActive(user: UserProfile) {
    if (!supabase) return
    const { error: invokeError } = await invokeAdminUsers({ action: 'update', id: user.id, isActive: !user.isActive })
    if (invokeError) { window.alert(await getFunctionErrorMessage(invokeError) ?? 'Gagal memperbarui status pengguna.'); return }
    void loadUsers()
  }

  async function removeUser(user: UserProfile) {
    if (!supabase) return
    if (user.id === currentUserId) { window.alert('Tidak dapat menghapus akun sendiri.'); return }
    if (!window.confirm(`Hapus pengguna ${user.fullName}?`)) return
    const { error: invokeError } = await invokeAdminUsers({ action: 'delete', id: user.id })
    if (invokeError) { window.alert(await getFunctionErrorMessage(invokeError) ?? 'Gagal menghapus pengguna.'); return }
    void loadUsers()
  }

  async function regeneratePassword(user: UserProfile) {
    if (!supabase) return
    if (!window.confirm(`Reset password untuk ${user.fullName}?\n\nPassword lama langsung diganti dan user wajib membuat password baru saat login berikutnya.`)) return

    const newPassword = generatePassword()
    const { error: invokeError } = await invokeAdminUsers({ action: 'update', id: user.id, password: newPassword })

    if (invokeError) {
      window.alert(await getFunctionErrorMessage(invokeError) ?? 'Gagal generate password.');
      return
    }

    // Tandai sebagai password sementara agar user wajib menggantinya saat login
    // berikutnya. Kredensial baru hanya ditampilkan sekali via alert; tidak disimpan.
    await supabase.from('profiles').update({ is_temp_password: true }).eq('id', user.id)
    void loadUsers()
    alert(`Password berhasil direset untuk ${user.fullName}!\n\nUsername: ${user.username}\nPassword sementara: ${newPassword}\n\nBerikan ke user. User akan diminta mengganti password ini saat login.`)
  }

  const rwOptions = rw.filter((item) => item.kelurahanId === selectedKelurahanId)
  const rtOptions = rt.filter((item) => item.rwId === selectedRwId)
  const keyword = searchTerm.trim().toLowerCase()
  const getKelurahanName = (kelurahanId?: string) => kelurahan.find((item) => item.id === kelurahanId)?.name ?? '-'
  const getRwName = (rwId?: string) => rw.find((item) => item.id === rwId)?.name ?? '-'
  const getRtName = (rtId?: string) => rt.find((item) => item.id === rtId)?.name ?? '-'
  const filteredUsers = users.filter((user) => {
    if (filterKelurahanId && user.kelurahanId !== filterKelurahanId) return false
    if (!keyword) return true

    const searchableText = [
      user.fullName,
      user.username,
      user.nik,
      user.phone,
      user.email ?? '',
      ROLE_LABELS[user.role],
      getKelurahanName(user.kelurahanId),
      `RW ${getRwName(user.rwId)}`,
      `RT ${getRtName(user.rtId)}`,
    ].join(' ').toLowerCase()

    return searchableText.includes(keyword)
  })
  const roleHints: Record<UserRole, string> = {
    super_admin: 'Full akses semua modul',
    admin: 'Akses dipilih per modul',
    kader: 'Hanya modul Entry Data',
  }
  const adminModules = MODULES.filter((m) => m.key !== 'pengguna')

  return <section className="master-page pengguna-page">
    <div className="page-heading">
      <div><p className="eyebrow">DATA MASTER</p><h1>Pengguna Kader & Relawan</h1><p>Kelola akun kader, relawan, dan admin yang dapat mengakses SIGESIT.</p></div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah pengguna</button>
    </div>
    {formOpen && <form className="region-form" onSubmit={submit}>
      <strong>{editing ? 'Edit' : 'Tambah'} pengguna</strong>
      {error && <div className="auth-error">{error}</div>}
      <div className="region-form-fields">
        <label>Nama lengkap<input defaultValue={editing?.fullName} name="fullName" required /></label>
        <label>NIK (16 digit)<input defaultValue={editing?.nik} maxLength={16} minLength={16} name="nik" required type="text" /></label>
        <label>No. HP<input defaultValue={editing?.phone} name="phone" required type="tel" /></label>
        {editing && <label>Username<input name="username" onChange={(event) => setUsernameDraft(event.target.value)} required value={usernameDraft} /></label>}
        {editing && <label>Password baru (opsional)<input autoComplete="new-password" minLength={8} name="password" placeholder="Kosongkan jika tidak ingin mengganti" type="password" /></label>}
        <label>Kelurahan<select name="kelurahanId" onChange={(event) => { setSelectedKelurahanId(event.target.value); setSelectedRwId('') }} value={selectedKelurahanId} required><option value="">Pilih kelurahan</option>{kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>RW<select disabled={!selectedKelurahanId} name="rwId" onChange={(event) => setSelectedRwId(event.target.value)} value={selectedRwId} required><option value="">Pilih RW</option>{rwOptions.map((item) => <option key={item.id} value={item.id}>RW {item.name}</option>)}</select></label>
        <label>RT<select defaultValue={editing?.rtId ?? ''} disabled={!selectedRwId} name="rtId" required><option value="">Pilih RT</option>{rtOptions.map((item) => <option key={item.id} value={item.id}>RT {item.name}</option>)}</select></label>
        <label>Status<select defaultValue={editing?.isActive === false ? 'off' : 'on'} name="isActive"><option value="on">Aktif</option><option value="off">Nonaktif</option></select></label>
        <div className="role-field wide">
          <span className="field-title">Level akses pengguna</span>
          <div className="role-picker">
            {(['super_admin', 'admin', 'kader'] as UserRole[]).map((r) => (
              <button className={role === r ? 'role-option active' : 'role-option'} key={r} onClick={() => changeRole(r)} type="button">
                <strong>{ROLE_LABELS[r]}</strong>
                <small>{roleHints[r]}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="module-access wide">
          <span className="field-title">Akses modul</span>
          {role === 'super_admin' && <p className="access-note">Super Admin mendapat <strong>full akses</strong> ke semua modul dan fitur tanpa batasan.</p>}
          {role === 'kader' && <p className="access-note">Kader hanya dapat mengakses modul <strong>Entry Data</strong> dan hanya melihat data milik sendiri.</p>}
          {role === 'admin' && <div className="module-grid">
            {adminModules.map((m) => (
              <label className="checkbox-label" key={m.key}>
                <input checked={moduleAccess[m.key]} onChange={(e) => setModuleAccess({ ...moduleAccess, [m.key]: e.target.checked } as ModuleAccess)} type="checkbox" />
                <span>{m.icon} {m.label}</span>
              </label>
            ))}
          </div>}
        </div>
        {!editing && <div className="generated-info wide">
          <p><strong>Username:</strong> Akan digenerate otomatis (5 digit terakhir NIK + 3 huruf unik)</p>
          <p><strong>Password:</strong> Akan digenerate otomatis (12 karakter) dan ditampilkan setelah pengguna dibuat</p>
        </div>}
        {editing && <div className="generated-info wide">
          <p><strong>Email:</strong> otomatis mengikuti username → <strong>{usernameDraft.trim() || '…'}@sigesit.local</strong></p>
          <p><strong>Password:</strong> isi hanya jika ingin mengganti password; kosongkan untuk mempertahankan password lama.</p>
        </div>}
      </div>
      <div className="form-actions"><button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button><button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan…' : 'Simpan'}</button></div>
    </form>}
    <div className="user-list-head">
      <div className="user-toolbar">
        <label>
          <span>Filter Kelurahan</span>
          <select onChange={(event) => setFilterKelurahanId(event.target.value)} value={filterKelurahanId}>
            <option value="">Semua kelurahan</option>
            {kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          <span>Pencarian bebas</span>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari nama, username, NIK, HP, email, RW, RT..."
            type="search"
            value={searchTerm}
          />
        </label>
      </div>
      <p className="user-toolbar-summary">Menampilkan {filteredUsers.length} dari {users.length} pengguna</p>
      <div className="user-col-head" aria-hidden="true">
        <span>Pengguna</span>
        <span>Aksi</span>
      </div>
    </div>
    <div className="region-list">
      {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}
      {loading ? <div className="empty-state"><span>♙</span><h2>Memuat data pengguna…</h2></div> : users.length === 0 ? <div className="empty-state"><span>♙</span><h2>Belum ada pengguna</h2><p>Tambahkan akun kader atau admin untuk mulai mengelola akses.</p></div> : filteredUsers.length === 0 ? <div className="empty-state"><span>⌕</span><h2>Pengguna tidak ditemukan</h2><p>Ubah filter kelurahan atau kata kunci pencarian.</p></div> : filteredUsers.map((user) => <article className="region-row user-row" key={user.id}>
        <div className="user-main">
          <div className="user-title">
            <strong>{user.fullName}</strong>
            <span className={`role-badge role-${user.role}`}>{ROLE_LABELS[user.role]}</span>
            {!user.isActive && <span className="role-badge inactive">Nonaktif</span>}
          </div>
          <small>
            Username: {user.username}
            {` · No. Telp: ${user.phone || '-'}`}
            {user.email && ` · ${user.email}`}
          </small>
          <small className="user-region">
            Kelurahan: {getKelurahanName(user.kelurahanId)} · RW {getRwName(user.rwId)} · RT {getRtName(user.rtId)}
          </small>
          <div className="module-badges">
            {user.role === 'super_admin'
              ? <span className="module-badge full">Full akses semua modul</span>
              : MODULES.filter((m) => user.moduleAccess[m.key]).map((m) => <span className="module-badge" key={m.key}>{m.icon} {m.label}</span>)}
          </div>
        </div>
        <div className="row-actions">
          <button className="edit-button btn-edit" onClick={() => openForm(user)} type="button">Edit</button>
          <button className="secondary btn-reset" onClick={() => regeneratePassword(user)} type="button">Reset Password</button>
          <button className="secondary" onClick={() => toggleActive(user)} type="button">{user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
          <button className="delete-button btn-delete" onClick={() => removeUser(user)} type="button">Hapus</button>
        </div>
      </article>)}
    </div>
  </section>
}

function PanganPage({ profile, kelurahan, rw, rt, foodInspections, setFoodInspections }: {
  profile: UserProfile | null;
  kelurahan: Region[];
  rw: Region[];
  rt: Region[];
  foodInspections: FoodInspectionResult[];
  setFoodInspections: (inspections: FoodInspectionResult[]) => void;
}) {
  const inspections = foodInspections
  const setInspections = setFoodInspections
  const [loading, setLoading] = useState(true)
  const [groupTppList, setGroupTppList] = useState<GroupTpp[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [filterStart, setFilterStart] = useState(defaultFilterStart)
  const [filterEnd, setFilterEnd] = useState(defaultFilterEnd)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [editing, setEditing] = useState<FoodInspectionResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<{
    entryDate: string
    jenisTppId: string
    kelurahanId: string
    rwId: string
    rtId: string
    address: string
    penanggungJawab: string
    phone: string
    hasilIkl: 'MMS' | 'TMS' | ''
    samples: FoodInspectionSample[]
  }>({
    entryDate: new Date().toISOString().split('T')[0],
    jenisTppId: '',
    kelurahanId: profile?.kelurahanId || kelurahan[0]?.id || '',
    rwId: '',
    rtId: '',
    address: '',
    penanggungJawab: profile?.fullName || '',
    phone: profile?.phone || '',
    hasilIkl: '',
    samples: [emptySample()],
  })

  const rwOptions = rw.filter((item) => !formData.kelurahanId || item.kelurahanId === formData.kelurahanId)
  const rtOptions = rt.filter((item) => !formData.rwId || item.rwId === formData.rwId)

  function emptySample(): FoodInspectionSample {
    return { nama_makanan: '', boraks: '', formalin: '', rodaminB: '', metanilYellow: '', eColi: '', remarks: '' }
  }

  function updateSample(idx: number, patch: Partial<FoodInspectionSample>) {
    setFormData((prev) => ({
      ...prev,
      samples: prev.samples.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))
  }

  function addSample() {
    setFormData((prev) => ({ ...prev, samples: [...prev.samples, emptySample()] }))
  }

  function removeSample(idx: number) {
    if (formData.samples.length <= 1) return
    setFormData((prev) => ({ ...prev, samples: prev.samples.filter((_, i) => i !== idx) }))
  }

  async function loadInspections() {
    if (!supabase || !profile) { setLoading(false); return }
    setLoading(true)
    try {
      let foodQuery = supabase
        .from('food_inspection_results')
        .select('*')
      if (profile.role === 'kader') foodQuery = foodQuery.eq('officer_id', profile.id)
      const { data, error: loadError } = await foodQuery
        .order('entry_date', { ascending: false })
      if (loadError) {
        setError(`Gagal memuat data hasil pemeriksaan: ${loadError.message}`)
        setLoading(false)
        return
      }
      setInspections(!data || data.length === 0 ? [] : (data as FoodInspectionResultRow[]).map(mapFoodInspectionRow))
    } catch (err) {
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function loadGroupTpp() {
    if (!supabase) { setGroupTppList([]); return }
    try {
      const { data, error: loadError } = await supabase.from('group_tpp').select('id, name').order('name')
      if (loadError) { console.error('Error loading group_tpp:', loadError.message); return }
      if (data) setGroupTppList(data as GroupTpp[])
    } catch (err) {
      console.error('Unexpected error loading group_tpp:', err)
    }
  }

  useEffect(() => { void loadGroupTpp() }, [])
  useEffect(() => { if (profile) void loadInspections() }, [profile])

  // Default kelurahan form bisa basi (id dummy pra-load) bila daftar wilayah
  // tiba belakangan. Selaraskan ke data terbaru selama form tambah baru dibuka.
  useEffect(() => {
    if (formOpen && editing) return
    setFormData((prev) => {
      if (prev.kelurahanId && kelurahan.some((k) => k.id === prev.kelurahanId)) return prev
      const def = profile?.kelurahanId && kelurahan.some((k) => k.id === profile.kelurahanId)
        ? profile.kelurahanId
        : (kelurahan[0]?.id || '')
      if (def === prev.kelurahanId) return prev
      return { ...prev, kelurahanId: def, rwId: '', rtId: '' }
    })
  }, [kelurahan, profile?.kelurahanId, formOpen, editing])

  function openForm(inspection?: FoodInspectionResult) {
    setEditing(inspection ?? null)
    setError('')
    if (inspection) {
      setFormData({
        entryDate: inspection.entryDate,
        jenisTppId: inspection.jenisTppId || '',
        kelurahanId: inspection.kelurahanId || kelurahan[0]?.id || '',
        rwId: inspection.rwId || '',
        rtId: inspection.rtId || '',
        address: inspection.address || '',
        penanggungJawab: inspection.penanggungJawab || '',
        phone: inspection.phone || '',
        hasilIkl: inspection.hasilIkl,
        samples: inspection.samples.length > 0 ? inspection.samples : [emptySample()],
      })
    } else {
      setFormData({
        entryDate: new Date().toISOString().split('T')[0],
        jenisTppId: '',
        kelurahanId: profile?.kelurahanId || kelurahan[0]?.id || '',
        rwId: '',
        rtId: '',
        address: '',
        penanggungJawab: profile?.fullName || '',
        phone: profile?.phone || '',
        hasilIkl: '',
        samples: [emptySample()],
      })
    }
    setFormOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    setSubmitting(true)
    setError('')
    if (!formData.entryDate) { setError('Tanggal harus diisi'); setSubmitting(false); return }
    const dayName = new Date(formData.entryDate).toLocaleDateString('id-ID', { weekday: 'long' })
    const samplesPayload = formData.samples.map((s) => ({
      jenis_makanan: s.nama_makanan,
      boraks: s.boraks,
      formalin: s.formalin,
      rodamin_b: s.rodaminB,
      metanil_yellow: s.metanilYellow,
      e_coli: s.eColi,
      keterangan: s.remarks,
    }))
    const payload: any = {
      entry_date: formData.entryDate,
      entry_day: dayName,
      jenis_tpp_id: formData.jenisTppId || null,
      kelurahan_id: formData.kelurahanId || null,
      rw_id: formData.rwId || null,
      rt_id: formData.rtId || null,
      address: formData.address || null,
      penanggung_jawab: formData.penanggungJawab || null,
      phone: formData.phone || null,
      hasil_ikl: formData.hasilIkl || null,
      // Kolom legacy untuk kompatibilitas: isi dari sampel pertama agar tidak NULL.
      e_coli_result: formData.samples[0]?.eColi || null,
      samples: samplesPayload,
    }
    // officer_id hanya di-set saat insert; saat edit pertahankan pemilik asli.
    if (!editing) payload.officer_id = profile.id
    try {
      let result
      if (editing) {
        result = await supabase.from('food_inspection_results').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('food_inspection_results').insert(payload)
      }
      if (result.error) throw result.error
      setFormOpen(false)
      setEditing(null)
      void loadInspections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil pemeriksaan')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(item: FoodInspectionResult) {
    if (!window.confirm(`Hapus hasil pemeriksaan tanggal ${item.entryDate}?`)) return
    if (!supabase) return
    const { error: delError } = await supabase.from('food_inspection_results').delete().eq('id', item.id)
    if (delError) { window.alert(`Gagal menghapus hasil pemeriksaan: ${delError.message}`); return }
    void loadInspections()
  }

  function exportExcel() {
    if (filtered.length === 0) { window.alert('Tidak ada data hasil pemeriksaan untuk diexport.'); return }
    const header = ['No', 'Tanggal', 'Hari', 'Jenis TPP', 'Kelurahan', 'RW', 'RT', 'Alamat', 'Penanggung Jawab', 'Phone', 'Hasil IKL', 'Nama Sampel', 'Boraks', 'Formalin', 'Rodamin B', 'Metanil Yellow', 'E-coli', 'Keterangan', 'Status']
    const rows: (string | number | null)[][] = []
    filtered.forEach((item, idx) => {
      const tppName = item.jenisTppId ? groupTppList.find((g) => g.id === item.jenisTppId)?.name : undefined
      const kelName = item.kelurahanId ? kelurahan.find((k) => k.id === item.kelurahanId)?.name : undefined
      const rwName = item.rwId ? rw.find((r) => r.id === item.rwId)?.name : undefined
      const rtName = item.rtId ? rt.find((r) => r.id === item.rtId)?.name : undefined
      if (item.samples.length === 0) {
        rows.push([idx + 1, item.entryDate, item.entryDay ?? null, tppName ?? null, kelName ?? null, rwName ?? null, rtName ?? null, item.address ?? null, item.penanggungJawab ?? null, item.phone ?? null, item.hasilIkl || null, null, null, null, null, null, null, null, item.overallStatus ?? null])
      } else {
        item.samples.forEach((s) => {
          rows.push([idx + 1, item.entryDate, item.entryDay ?? null, tppName ?? null, kelName ?? null, rwName ?? null, rtName ?? null, item.address ?? null, item.penanggungJawab ?? null, item.phone ?? null, item.hasilIkl || null, s.nama_makanan || null, s.boraks || null, s.formalin || null, s.rodaminB || null, s.metanilYellow || null, s.eColi || null, s.remarks || null, item.overallStatus ?? null])
        })
      }
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ fileName: `hasil_pangan_${today}.xlsx`, sheetName: 'Hasil Pangan/Makanan', header, rows })
  }

  const filtered = inspections.filter((item) => {
    if (filterKelurahanId && item.kelurahanId !== filterKelurahanId) return false
    if (!inISODateRange(item.entryDate, filterStart, filterEnd)) return false
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase()
      const tppName = item.jenisTppId ? groupTppList.find((g) => g.id === item.jenisTppId)?.name : undefined
      const inHeader = (item.penanggungJawab || '').toLowerCase().includes(kw)
        || (item.phone || '').toLowerCase().includes(kw)
        || (item.address || '').toLowerCase().includes(kw)
        || (tppName || '').toLowerCase().includes(kw)
      const inSamples = item.samples.some((s) => (s.nama_makanan || '').toLowerCase().includes(kw) || (s.remarks || '').toLowerCase().includes(kw))
      if (!inHeader && !inSamples) return false
    }
    return true
  })

  if (loading) return <section className="master-page"><div className="empty-state"><span>🍱</span><h2>Memuat data hasil pemeriksaan pangan…</h2></div></section>

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">PEMERIKSAAN</p><h1>Hasil Pemeriksaan Pangan/Makanan</h1><p>Kelola hasil pemeriksaan pangan/makanan (Boraks, Formalin, Rodamin B, Metanil Yellow, E-coli).</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button" disabled={inspections.length === 0}>Export Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Hasil</button>
      </div>
    </div>

    {formOpen && <form className="entry-form compact-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMERIKSAAN</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Hasil Pemeriksaan Pangan</h1>
          <p>Isi data pemeriksaan pangan/makanan dan tiap sampel makanan.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <section className="form-section">
        <h2>Informasi Pemeriksaan</h2>
        <div className="form-grid">
          <label>Tanggal<input type="date" value={formData.entryDate} onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })} required /></label>
          <label>Hasil IKL
            <select value={formData.hasilIkl} onChange={(e) => setFormData({ ...formData, hasilIkl: e.target.value as 'MMS' | 'TMS' | '' })}>
              <option value="">Belum diperiksa</option>
              <option value="MMS">MMS</option>
              <option value="TMS">TMS</option>
            </select>
          </label>
          <label>Jenis TPP
            <select value={formData.jenisTppId} onChange={(e) => setFormData({ ...formData, jenisTppId: e.target.value })}>
              <option value="">Pilih jenis TPP</option>
              {groupTppList.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label>Kelurahan
            <select value={formData.kelurahanId} onChange={(e) => setFormData({ ...formData, kelurahanId: e.target.value, rwId: '', rtId: '' })} required>
              <option value="">Pilih kelurahan</option>
              {kelurahan.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
          <label>RW
            <select value={formData.rwId} onChange={(e) => setFormData({ ...formData, rwId: e.target.value, rtId: '' })} disabled={!formData.kelurahanId}>
              <option value="">Pilih RW</option>
              {rwOptions.map((r) => <option key={r.id} value={r.id}>RW {r.name}</option>)}
            </select>
          </label>
          <label>RT
            <select value={formData.rtId} onChange={(e) => setFormData({ ...formData, rtId: e.target.value })} disabled={!formData.rwId}>
              <option value="">Pilih RT</option>
              {rtOptions.map((r) => <option key={r.id} value={r.id}>RT {r.name}</option>)}
            </select>
          </label>
          <label>Alamat<textarea className="notes-textarea" style={{ width: '100%', minHeight: '60px', height: '60px' }} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} placeholder="Alamat lokasi pemeriksaan..." /></label>
          <label>Penanggung Jawab<input value={formData.penanggungJawab} onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })} placeholder="Nama penanggung jawab" /></label>
          <label>Phone<input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Nomor HP" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Sampel Makanan</h2>
        {formData.samples.map((s, idx) => (
          <div key={idx} className="form-grid" style={{ marginBottom: idx === formData.samples.length - 1 ? '8px' : '16px' }}>
            <label><span className="entry-no">{idx + 1}.</span> Nama Sampel (Pangan/Air/dan sejenisnya)<input value={s.nama_makanan} onChange={(e) => updateSample(idx, { nama_makanan: e.target.value })} placeholder="Nama sampel pangan/air/dan sejenisnya" /></label>
            <label>Boraks
              <select value={s.boraks} onChange={(e) => updateSample(idx, { boraks: e.target.value as 'Positif' | 'Negatif' | '' })}>
                <option value="">-</option>
                <option value="Positif">Positif</option>
                <option value="Negatif">Negatif</option>
              </select>
            </label>
            <label>Formalin
              <select value={s.formalin} onChange={(e) => updateSample(idx, { formalin: e.target.value as 'Positif' | 'Negatif' | '' })}>
                <option value="">-</option>
                <option value="Positif">Positif</option>
                <option value="Negatif">Negatif</option>
              </select>
            </label>
            <label>Rodamin B
              <select value={s.rodaminB} onChange={(e) => updateSample(idx, { rodaminB: e.target.value as 'Positif' | 'Negatif' | '' })}>
                <option value="">-</option>
                <option value="Positif">Positif</option>
                <option value="Negatif">Negatif</option>
              </select>
            </label>
            <label>Metanil Yellow
              <select value={s.metanilYellow} onChange={(e) => updateSample(idx, { metanilYellow: e.target.value as 'Positif' | 'Negatif' | '' })}>
                <option value="">-</option>
                <option value="Positif">Positif</option>
                <option value="Negatif">Negatif</option>
              </select>
            </label>
            <label>E-coli
              <select value={s.eColi} onChange={(e) => updateSample(idx, { eColi: e.target.value as 'Positif' | 'Negatif' | '' })}>
                <option value="">-</option>
                <option value="Positif">Positif</option>
                <option value="Negatif">Negatif</option>
              </select>
            </label>
            <label>Keterangan<textarea className="notes-textarea" style={{ width: '100%', minHeight: '60px', height: '60px' }} value={s.remarks} onChange={(e) => updateSample(idx, { remarks: e.target.value })} rows={2} placeholder="Keterangan sampel..." /></label>
          </div>
        ))}
        <div style={{ marginTop: '8px' }}>
          <button className="text-button" onClick={addSample} type="button">+ Tambah Sampel</button>
          {formData.samples.length > 1 && <button className="text-button" onClick={() => removeSample(formData.samples.length - 1)} type="button">Hapus Sampel Terakhir</button>}
        </div>
      </section>

      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    {!formOpen && inspections.length === 0 && <div className="empty-state"><span>🍱</span><h2>Belum ada data hasil pemeriksaan pangan/makanan</h2><p>Klik tombol di atas untuk menambahkan hasil pemeriksaan baru.</p></div>}

    {!formOpen && inspections.length > 0 && (
      <>
        <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="filter-grid cols-3" style={{ gap: '16px', margin: 0 }}>
            <label>Filter Kelurahan
              <select value={filterKelurahanId} onChange={(e) => { setFilterKelurahanId(e.target.value) }}>
                <option value="">Semua Kelurahan</option>
                {kelurahan.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </label>
            <label>Tanggal Awal
              <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
            </label>
            <label>Tanggal Akhir
              <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} min={filterStart || undefined} />
            </label>
            <label className="span-all">Pencarian
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Nama sampel / penanggung jawab..." />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="secondary" onClick={() => { setFilterKelurahanId(''); setFilterStart(defaultFilterStart()); setFilterEnd(defaultFilterEnd()); setSearchKeyword('') }} style={{ width: '100%' }}>Reset Filter</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Menampilkan {filtered.length} dari {inspections.length} data</span>
            </div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th><th>Tanggal</th><th>Jenis TPP</th><th>Lokasi</th><th>Penanggung Jawab</th><th>Hasil IKL</th><th>Sampel & Hasil</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>Tidak ada data pada periode/filter yang dipilih. Ubah filter tanggal atau klik Reset Filter.</td></tr>
              )}
              {filtered.map((item, idx) => {
                const kelName = item.kelurahanId ? kelurahan.find((k) => k.id === item.kelurahanId)?.name : undefined
                const rwName = item.rwId ? rw.find((r) => r.id === item.rwId)?.name : undefined
                const rtName = item.rtId ? rt.find((r) => r.id === item.rtId)?.name : undefined
                const tppName = item.jenisTppId ? groupTppList.find((g) => g.id === item.jenisTppId)?.name : undefined
                const lokasiCell = [kelName, rwName, rtName].filter(Boolean).join(' / ') || '-'
                const foodSamples = item.samples.length === 0 ? (
                  <span className="food-sample-empty">Tidak ada sampel</span>
                ) : (
                  <div className="food-sample-list">
                    {item.samples.map((sample, sampleIndex) => (
                      <div className="food-sample-item" key={`${item.id}-sample-${sampleIndex}`}>
                        <div className="food-sample-name">
                          <strong>{sampleIndex + 1}. {sample.nama_makanan || 'Tanpa nama'}</strong>
                        </div>
                        <div className="food-sample-results">
                          <span className={sample.boraks === 'Positif' ? 'food-sample-result positive' : sample.boraks === 'Negatif' ? 'food-sample-result negative' : 'food-sample-result'}>Boraks: {sample.boraks || '-'}</span>
                          <span className={sample.formalin === 'Positif' ? 'food-sample-result positive' : sample.formalin === 'Negatif' ? 'food-sample-result negative' : 'food-sample-result'}>Formalin: {sample.formalin || '-'}</span>
                          <span className={sample.rodaminB === 'Positif' ? 'food-sample-result positive' : sample.rodaminB === 'Negatif' ? 'food-sample-result negative' : 'food-sample-result'}>Rodamin B: {sample.rodaminB || '-'}</span>
                          <span className={sample.metanilYellow === 'Positif' ? 'food-sample-result positive' : sample.metanilYellow === 'Negatif' ? 'food-sample-result negative' : 'food-sample-result'}>Metanil Yellow: {sample.metanilYellow || '-'}</span>
                          <span className={sample.eColi === 'Positif' ? 'food-sample-result positive' : sample.eColi === 'Negatif' ? 'food-sample-result negative' : 'food-sample-result'}>E-coli: {sample.eColi || '-'}</span>
                        </div>
                        {sample.remarks && <div className="food-sample-remarks">Keterangan: {sample.remarks}</div>}
                      </div>
                    ))}
                  </div>
                )
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}> {idx + 1}</td>
                    <td>{item.entryDate}</td>
                    <td>{tppName || '-'}</td>
                    <td>{lokasiCell}</td>
                    <td>{item.penanggungJawab || '-'}</td>
                    <td>{item.hasilIkl || '-'}</td>
                    <td>{foodSamples}</td>
                    <td><span style={{ color: item.overallStatus === 'Lulus' ? '#16a34a' : '#b91c1c', fontWeight: 600 }}>{item.overallStatus || '-'}</span></td>
                    <td>
                      <div className="entry-actions">
                        <button className="text-button btn-edit" onClick={() => openForm(item)} type="button">Edit</button>
                        <button className="text-button btn-delete" onClick={() => remove(item)} type="button">Hapus</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </section>
}

function GroupTppPage() {
  const [groupTppList, setGroupTppList] = useState<GroupTpp[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<GroupTpp | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')

  const [formData, setFormData] = useState({
    name: '',
  })

  const filteredList = groupTppList.filter(item =>
    item.name.toLowerCase().includes(searchKeyword.toLowerCase())
  )

  async function loadGroupTpp() {
    if (!supabase) { setGroupTppList([]); setLoading(false); return }
    setLoading(true)
    try {
      const { data, error: loadError } = await supabase.from('group_tpp').select('*').order('name')
      if (loadError) {
        console.error('Error loading group_tpp:', loadError.message)
        setError(`Gagal memuat data: ${loadError.message}`)
        setLoading(false)
        return
      }
      if (data) {
        setGroupTppList(data as GroupTpp[])
      }
    } catch (err) {
      console.error('Unexpected error loading group_tpp:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadGroupTpp() }, [])

  function openForm(item?: GroupTpp) {
    setEditing(item ?? null)
    setFormData(item ? { name: item.name } : { name: '' })
    setFormOpen(true)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError('')

    try {
      if (editing) {
        const { error } = await supabase
          .from('group_tpp')
          .update({ name: formData.name })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('group_tpp')
          .insert({ name: formData.name })
        if (error) throw error
      }
      setFormOpen(false)
      setEditing(null)
      setFormData({ name: '' })
      await loadGroupTpp()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(item: GroupTpp) {
    if (!window.confirm(`Yakin ingin menghapus "${item.name}"?`)) return
    if (!supabase) return
    try {
      const { error } = await supabase.from('group_tpp').delete().eq('id', item.id)
      if (error) throw error
      await loadGroupTpp()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Gagal menghapus data')
    }
  }

  return (
    <section className="module-page">
      <header className="module-header">
        <div>
          <h2>Group / Jenis TPP</h2>
          <p>Kelola data group atau jenis TPP.</p>
        </div>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Group/Jenis</button>
      </header>

      {formOpen && (
        <form className="form-card" onSubmit={handleSubmit}>
          <h3>{editing ? 'Edit Group/Jenis TPP' : 'Tambah Group/Jenis TPP'}</h3>
          {error && <div className="form-error">{error}</div>}
          <label>
            Nama Group/Jenis TPP
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </label>
          <div className="form-actions">
            <button className="secondary" onClick={() => setFormOpen(false)} type="button">Batal</button>
            <button className="primary" disabled={submitting} type="submit">
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      {!formOpen && groupTppList.length > 0 && (
        <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="filter-grid cols-2" style={{ gap: '16px', margin: 0 }}>
            <label>Pencarian
              <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="Cari nama group/jenis..." />
            </label>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="secondary" onClick={() => { setSearchKeyword('') }} style={{ width: '100%' }}>Reset Pencarian</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Memuat data...</div>
      ) : filteredList.length === 0 ? (
        <div className="empty-state">
          <span>📋</span>
          <h2>Belum ada data Group/Jenis TPP</h2>
          <p>Klik tombol di atas untuk menambahkan data baru.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '50px' }}>#</th>
                <th>Nama Group/Jenis TPP</th>
                <th style={{ width: '150px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                  <td>{item.name}</td>
                  <td>
                    <div className="entry-actions">
                      <button className="text-button btn-edit" onClick={() => openForm(item)} type="button">Edit</button>
                      <button className="text-button btn-delete" onClick={() => remove(item)} type="button">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  function handleSave() {
    setSubmitting(true)
    setSuccess(false)
    saveSettings(settings)
    // Apply settings immediately
    const theme = getThemeById(settings.theme)
    document.documentElement.style.setProperty('--forest', theme.colors.primary)
    document.documentElement.style.setProperty('--teal', theme.colors.primaryLight)
    document.documentElement.style.setProperty('--mint', theme.colors.primaryBg)
    document.documentElement.style.setProperty('--ink', theme.colors.text)
    document.documentElement.style.setProperty('--muted', theme.colors.textSecondary)
    document.documentElement.style.setProperty('--line', theme.colors.border)
    document.documentElement.style.setProperty('--paper', theme.colors.surface)
    document.documentElement.style.fontFamily = settings.fontFamily
    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <section className="module-page">
      <header className="module-header">
        <div>
          <h2>Pengaturan</h2>
          <p>Ubah tampilan, bahasa, dan preferensi aplikasi.</p>
        </div>
      </header>

      <form className="form-card" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
        {success && <div className="form-success">Pengaturan berhasil disimpan!</div>}

        <label>
          Tema
          <select
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: e.target.value as ThemeId })}
          >
            {themes.map(theme => (
              <option key={theme.id} value={theme.id}>{theme.name}</option>
            ))}
          </select>
        </label>

        <label>
          Jenis Huruf
          <select
            value={settings.fontFamily}
            onChange={(e) => setSettings({ ...settings, fontFamily: e.target.value })}
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Poppins">Poppins</option>
          </select>
        </label>

        <label>
          Bahasa
          <select
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value as Language })}
          >
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
            <option value="su">Bahasa Sunda</option>
          </select>
        </label>

        <div className="form-actions">
          <button className="primary" disabled={submitting} type="submit">
            {submitting ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </section>
  )
}

const ABJ_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1ZJb9b0UevSdfhxtfBOYOyZbWQs9Knj7P1BkTXL7Fn9g/export?format=csv&gid=857836883'

type AbjReport = {
  tanggal: string
  dateMs: number
  kelurahan: string
  rw: string
  diperiksa: number
  positif: number
  negatif: number
  abj: number
  pelapor: string
  lokasiJentik: string
  wa: string
}

type DateRange = [number | null, number | null]

function dateRangeMs(start: string, end: string): DateRange {
  return [
    start ? new Date(`${start}T00:00:00`).getTime() : null,
    end ? new Date(`${end}T00:00:00`).getTime() : null,
  ]
}

function inDateRange(dateMs: number, range: DateRange): boolean {
  const [startMs, endMs] = range
  if (startMs !== null && dateMs < startMs) return false
  if (endMs !== null && dateMs > endMs) return false
  return true
}

// Default filter tanggal: tgl awal = tanggal 1 bulan berjalan, tgl akhir = hari ini (waktu lokal).
function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultFilterStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function defaultFilterEnd(): string {
  return toLocalISODate(new Date())
}

// Filter tanggal untuk string 'YYYY-MM-DD' (uji air/udara/pangan). Batas kosong = tanpa batas.
function inISODateRange(dateStr: string, start: string, end: string): boolean {
  if (start && dateStr < start) return false
  if (end && dateStr > end) return false
  return true
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function parseAbjRows(rows: string[][]): AbjReport[] {
  const reports: AbjReport[] = []
  for (const row of rows.slice(1)) {
    const tanggal = (row[1] ?? '').trim()
    const kelurahan = (row[2] ?? '').trim()
    if (!tanggal || !kelurahan) continue
    const date = new Date(tanggal.replace(/-/g, ' '))
    const valid = !Number.isNaN(date.getTime())
    const dateMs = valid ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : 0
    const diperiksa = Number(row[4]) || 0
    const positif = Number(row[5]) || 0
    const negatif = Number(row[6]) || 0
    const abj = Number(row[8]) || (diperiksa > 0 ? (negatif / diperiksa) * 100 : 0)
    reports.push({
      tanggal: tanggal.replace(/-/g, ' '),
      dateMs,
      kelurahan: kelurahan.toUpperCase(),
      rw: (row[3] ?? '').trim(),
      diperiksa,
      positif,
      negatif,
      abj,
      pelapor: (row[9] ?? '').trim(),
      lokasiJentik: (row[10] ?? '').trim(),
      wa: (row[11] ?? '').trim(),
    })
  }
  return reports
}

function LaporanPage() {
  const [reports, setReports] = useState<AbjReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterKelurahan, setFilterKelurahan] = useState('')
  const [filterStart, setFilterStart] = useState(defaultFilterStart)
  const [filterEnd, setFilterEnd] = useState(defaultFilterEnd)
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(ABJ_SHEET_CSV_URL)
      if (!res.ok) throw new Error(`Google Sheet merespons HTTP ${res.status}`)
      const text = await res.text()
      setReports(parseAbjRows(parseCsv(text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data laporan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const kelurahanOptions = [...new Set(reports.map((r) => r.kelurahan))].sort((a, b) => a.localeCompare(b, 'id-ID'))

  const filtered = reports.filter((r) => {
    if (filterKelurahan && r.kelurahan !== filterKelurahan) return false
    if (!inDateRange(r.dateMs, dateRangeMs(filterStart, filterEnd))) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!r.pelapor.toLowerCase().includes(q) && !r.rw.toLowerCase().includes(q) && !r.lokasiJentik.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalDiperiksa = filtered.reduce((sum, r) => sum + r.diperiksa, 0)
  const totalPositif = filtered.reduce((sum, r) => sum + r.positif, 0)
  const totalNegatif = filtered.reduce((sum, r) => sum + r.negatif, 0)
  const abjOverall = totalDiperiksa > 0 ? (totalNegatif / totalDiperiksa) * 100 : 0

  function exportExcel() {
    if (filtered.length === 0) {
      window.alert('Tidak ada data laporan untuk diexport.')
      return
    }
    const header = ['Tanggal', 'Kelurahan', 'RW', 'Rumah Diperiksa', 'Positif Jentik', 'Negatif Jentik', 'ABJ (%)', 'Pelapor', 'Lokasi Ditemukan Jentik', 'No WhatsApp']
    const rows = filtered.map((r) => [r.tanggal, r.kelurahan, r.rw, r.diperiksa, r.positif, r.negatif, Number(r.abj.toFixed(1)), r.pelapor, r.lokasiJentik, r.wa])
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ fileName: `laporan_abj_${today}.xlsx`, sheetName: 'Laporan ABJ', header, rows })
  }

  return (
    <section className="module-page">
      <header className="module-header">
        <div>
          <h2>Laporan ABJ (Jentik)</h2>
          <p>Rekap laporan pemeriksaan jentik berkader, terintegrasi dari Google Sheet.</p>
        </div>
        <button className="secondary" onClick={() => void load()} type="button">Muat Ulang</button>
      </header>

      {error && <div className="form-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon teal">📊</span>
          <div>
            <p>Total Laporan</p>
            <strong>{loading ? '…' : filtered.length}</strong>
            <small>Baris laporan tersaring</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">🏠</span>
          <div>
            <p>Rumah Diperiksa</p>
            <strong>{loading ? '…' : totalDiperiksa}</strong>
            <small>Total rumah diperiksa</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">🦟</span>
          <div>
            <p>Positif Jentik</p>
            <strong>{loading ? '…' : totalPositif}</strong>
            <small>Rumah ditemukan jentik</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon gold">%</span>
          <div>
            <p>ABJ Keseluruhan</p>
            <strong>{loading ? '…' : `${abjOverall.toFixed(1)}%`}</strong>
            <small>Negatif jentik / diperiksa</small>
          </div>
        </article>
      </div>

      <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="filter-grid cols-4" style={{ gap: '16px', margin: 0 }}>
          <label>Filter Kelurahan
            <select value={filterKelurahan} onChange={(e) => setFilterKelurahan(e.target.value)}>
              <option value="">Semua Kelurahan</option>
              {kelurahanOptions.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Tanggal Mulai
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          </label>
          <label>Tanggal Akhir
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} min={filterStart || undefined} />
          </label>
          <label>Pencarian
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari pelapor, RW, atau lokasi jentik..." />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <button className="secondary" onClick={() => { setFilterKelurahan(''); setFilterStart(defaultFilterStart()); setFilterEnd(defaultFilterEnd()); setSearchQuery('') }} type="button">Reset Filter</button>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Menampilkan {filtered.length} dari {reports.length} laporan · Periode {filterStart || '-'} s/d {filterEnd || '-'}</span>
        </div>
      </div>

      {loading ? <div className="empty-state"><span>📊</span><h2>Memuat data laporan…</h2></div> : filtered.length === 0 ? <div className="empty-state"><span>📊</span><h2>Tidak ada data laporan</h2><p>Ubah filter atau muat ulang data dari Google Sheet.</p></div> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Tanggal</th>
                <th>Kelurahan</th>
                <th>RW</th>
                <th>Rumah Diperiksa</th>
                <th>Positif Jentik</th>
                <th>Negatif Jentik</th>
                <th>ABJ (%)</th>
                <th>Pelapor</th>
                <th>Lokasi Ditemukan Jentik</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => (
                <tr key={`${r.tanggal}-${r.pelapor}-${index}`}>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{index + 1}</td>
                  <td>{r.tanggal}</td>
                  <td>{r.kelurahan}</td>
                  <td style={{ textAlign: 'center' }}>{r.rw}</td>
                  <td style={{ textAlign: 'center' }}>{r.diperiksa}</td>
                  <td style={{ textAlign: 'center' }}>{r.positif}</td>
                  <td style={{ textAlign: 'center' }}>{r.negatif}</td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{r.abj.toFixed(1)}</td>
                  <td>{r.pelapor}</td>
                  <td>{r.lokasiJentik || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="form-actions" style={{ marginTop: '16px' }}>
          <button className="primary" onClick={exportExcel} type="button">Export Excel</button>
        </div>
      )}
    </section>
  )
}

const DBD_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1r3f7iJhjFaXHR3079dPg_xRPdBetzsskf09yfmDVZrs/export?format=csv&gid=712907827'

type DbdReport = {
  dateMs: number
  tanggalSakit: string
  nama: string
  nik: string
  kelamin: string
  umur: string
  kelurahan: string
  rw: string
  rt: string
  rs: string
  tanggalRawat: string
  tanggalSelesai: string
  kondisi: string
  trombosit: string
  gejala: string
  wa: string
}

function formatSheetDate(value: string): string {
  const raw = value.trim()
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function parseDbdRows(rows: string[][]): DbdReport[] {
  const reports: DbdReport[] = []
  for (const row of rows.slice(1)) {
    const tanggal = (row[3] ?? '').trim()
    const nama = (row[5] ?? '').trim()
    if (!tanggal || !nama) continue
    const date = new Date(tanggal)
    const dateMs = Number.isNaN(date.getTime()) ? 0 : new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    reports.push({
      dateMs,
      tanggalSakit: formatSheetDate(tanggal),
      nama,
      nik: (row[4] ?? '').trim(),
      kelamin: (row[6] ?? '').trim(),
      umur: (row[7] ?? '').trim(),
      kelurahan: (row[12] ?? '').trim().toUpperCase(),
      rw: (row[13] ?? '').trim(),
      rt: (row[14] ?? '').trim(),
      rs: (row[21] ?? '').trim(),
      tanggalRawat: formatSheetDate(row[20] ?? ''),
      tanggalSelesai: formatSheetDate(row[22] ?? ''),
      kondisi: (row[23] ?? '').trim(),
      trombosit: (row[24] ?? '').trim(),
      gejala: (row[25] ?? '').trim(),
      wa: (row[29] ?? '').trim(),
    })
  }
  return reports
}

function LaporanDbdPage() {
  const [reports, setReports] = useState<DbdReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterKelurahan, setFilterKelurahan] = useState('')
  const [filterStart, setFilterStart] = useState(defaultFilterStart)
  const [filterEnd, setFilterEnd] = useState(defaultFilterEnd)
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(DBD_SHEET_CSV_URL)
      if (!res.ok) throw new Error(`Google Sheet merespons HTTP ${res.status}`)
      const text = await res.text()
      setReports(parseDbdRows(parseCsv(text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data laporan.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const kelurahanOptions = [...new Set(reports.map((r) => r.kelurahan))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'id-ID'))

  const filtered = reports.filter((r) => {
    if (filterKelurahan && r.kelurahan !== filterKelurahan) return false
    if (!inDateRange(r.dateMs, dateRangeMs(filterStart, filterEnd))) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!r.nama.toLowerCase().includes(q) && !r.rs.toLowerCase().includes(q) && !r.gejala.toLowerCase().includes(q)) return false
    }
    return true
  })

  const totalKasus = filtered.length
  const totalSembuh = filtered.filter((r) => r.kondisi.toLowerCase().includes('sembuh')).length
  const totalMeninggal = filtered.filter((r) => r.kondisi.toLowerCase().includes('meninggal')).length
  const cfr = totalKasus > 0 ? (totalMeninggal / totalKasus) * 100 : 0

  function exportExcel() {
    if (filtered.length === 0) {
      window.alert('Tidak ada data laporan untuk diexport.')
      return
    }
    const header = ['Tanggal Mulai Sakit', 'Nama Pasien', 'NIK', 'Jenis Kelamin', 'Umur', 'Kelurahan', 'RW', 'RT', 'Dirawat Di', 'Mulai Dirawat', 'Selesai Dirawat', 'Kondisi Pulang', 'Trombosit Terendah', 'Gejala', 'No WhatsApp']
    const rows = filtered.map((r) => [r.tanggalSakit, r.nama, r.nik, r.kelamin, r.umur, r.kelurahan, r.rw, r.rt, r.rs, r.tanggalRawat, r.tanggalSelesai, r.kondisi, r.trombosit, r.gejala, r.wa])
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({ fileName: `laporan_dbd_${today}.xlsx`, sheetName: 'Laporan DBD', header, rows })
  }

  return (
    <section className="module-page">
      <header className="module-header">
        <div>
          <h2>Laporan DBD</h2>
          <p>Rekap laporan kasus DBD warga, terintegrasi dari Google Sheet.</p>
        </div>
        <button className="secondary" onClick={() => void load()} type="button">Muat Ulang</button>
      </header>

      {error && <div className="form-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-icon teal">🦟</span>
          <div>
            <p>Total Kasus</p>
            <strong>{loading ? '…' : totalKasus}</strong>
            <small>Kasus DBD dilaporkan</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">❤</span>
          <div>
            <p>Sembuh</p>
            <strong>{loading ? '…' : totalSembuh}</strong>
            <small>Kondisi pulang sembuh</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon coral">✝</span>
          <div>
            <p>Meninggal</p>
            <strong>{loading ? '…' : totalMeninggal}</strong>
            <small>Kondisi pulang meninggal</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon gold">%</span>
          <div>
            <p>CFR</p>
            <strong>{loading ? '…' : `${cfr.toFixed(1)}%`}</strong>
            <small>Meninggal / total kasus</small>
          </div>
        </article>
      </div>

      <div className="form-section" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="filter-grid cols-4" style={{ gap: '16px', margin: 0 }}>
          <label>Filter Kelurahan
            <select value={filterKelurahan} onChange={(e) => setFilterKelurahan(e.target.value)}>
              <option value="">Semua Kelurahan</option>
              {kelurahanOptions.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>Tanggal Mulai Sakit (dari)
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
          </label>
          <label>Tanggal Mulai Sakit (sampai)
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} min={filterStart || undefined} />
          </label>
          <label>Pencarian
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama pasien, RS, atau gejala..." />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <button className="secondary" onClick={() => { setFilterKelurahan(''); setFilterStart(defaultFilterStart()); setFilterEnd(defaultFilterEnd()); setSearchQuery('') }} type="button">Reset Filter</button>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Menampilkan {filtered.length} dari {reports.length} laporan · Periode {filterStart || '-'} s/d {filterEnd || '-'}</span>
        </div>
      </div>

      {loading ? <div className="empty-state"><span>🦟</span><h2>Memuat data laporan…</h2></div> : filtered.length === 0 ? <div className="empty-state"><span>🦟</span><h2>Tidak ada data laporan</h2><p>Ubah filter atau muat ulang data dari Google Sheet.</p></div> : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Mulai Sakit</th>
                <th>Nama Pasien</th>
                <th>L/P</th>
                <th>Umur</th>
                <th>Kelurahan</th>
                <th>RW/RT</th>
                <th>Dirawat Di</th>
                <th>Mulai Dirawat</th>
                <th>Selesai Dirawat</th>
                <th>Kondisi Pulang</th>
                <th>Trombosit Terendah</th>
                <th>Gejala</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => (
                <tr key={`${r.nik}-${r.nama}-${index}`}>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{index + 1}</td>
                  <td>{r.tanggalSakit}</td>
                  <td><strong>{r.nama}</strong></td>
                  <td style={{ textAlign: 'center' }}>{r.kelamin}</td>
                  <td>{r.umur}</td>
                  <td>{r.kelurahan}</td>
                  <td style={{ textAlign: 'center' }}>{r.rw}/{r.rt}</td>
                  <td>{r.rs}</td>
                  <td>{r.tanggalRawat || '-'}</td>
                  <td>{r.tanggalSelesai || '-'}</td>
                  <td>{r.kondisi || '-'}</td>
                  <td style={{ textAlign: 'center' }}>{r.trombosit || '-'}</td>
                  <td>{r.gejala || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="form-actions" style={{ marginTop: '16px' }}>
          <button className="primary" onClick={exportExcel} type="button">Export Excel</button>
        </div>
      )}
    </section>
  )
}

export default App
