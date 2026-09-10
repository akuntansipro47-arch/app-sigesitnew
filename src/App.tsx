import { useCallback, useEffect, useRef, useState, type FormEvent, useMemo } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { supabase, supabaseConfigured } from './lib/supabase'
import { canAccessView as authCanAccessView, canManageUsers, isSuperAdmin, isKader, getDefaultModuleAccess, ROLE_LABELS, ROLE_DESCRIPTIONS, MODULES } from './lib/auth'
import { exportToExcel, type ExcelCell } from './utils/exportExcel'
import { mapProfileRow, mapLocationRow, mapWaterQualityTestRow, mapAirQualityTestRow, mapPKMInfoRow, mapFoodInspectionRow, mapEntryRow, getFunctionErrorMessage, isEmptyUjiAirValue, isUjiAirValueValid, toDbTextValue, toDbUjiAirValue, formatWaterValue } from './utils/mappers'
import { useTranslation } from './i18n/context'
import { loadSettings, saveSettings, getThemeById, type AppSettings, type Language, type ThemeId } from './utils/settings'

type View = 'beranda' | 'entry' | 'wilayah' | 'pengguna' | 'profile' | 'profil_pengguna' | 'lokasi' | 'uji_air' | 'uji_udara' | 'pengaturan' | 'pangan' | 'group_tpp' | 'unauthorized'
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
}
type ProfileRow = { id: string; full_name: string; username: string; nik: string; phone: string; email: string | null; role: UserRole; kelurahan_id: string | null; rw_id: string | null; rt_id: string | null; is_active: boolean; module_access: Partial<ModuleAccess> | null; is_temp_password: boolean | null }

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

// Group TPP types
type GroupTpp = {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
}

type GroupTppRow = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

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

type FoodInspectionRow = {
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
  samples: FoodInspectionSample[] | null
  officer_id: string
  created_at: string
  updated_at: string
}

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
  createdAt?: string
  updatedAt?: string
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
  createdAt?: string
  updatedAt?: string
}

type AirQualityTestRow = { id: string; location_id: string; test_date: string; officer_id: string; temperature_1: number | null; temperature_2: number | null; temperature_3: number | null; temperature_unit: string; humidity_1: number | null; humidity_2: number | null; humidity_3: number | null; noise_1: number | null; noise_2: number | null; noise_3: number | null; lighting_1: number | null; lighting_2: number | null; lighting_3: number | null; pm25_1: number | null; pm25_2: number | null; pm25_3: number | null; pm10_1: number | null; pm10_2: number | null; pm10_3: number | null; ventilation_rate_1: number | null; ventilation_rate_2: number | null; ventilation_rate_3: number | null; notes: string | null }

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
  createdBy?: string
  kelurahanId: string
  rwId: string
  rtId: string
  familyCards: FamilyCard[]
  questionnaireResponses: QuestionnaireResponse[]
}

type EntryRow = {
  id: string
  entry_number: number
  entry_date: string
  officer_id: string
  created_by: string
  kelurahan_id: string
  rw_id: string
  rt_id: string
  created_at: string
  updated_at: string
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
  ],
  pengelolaan_air: [
    { code: 'air_diolah', text: 'Air diolah/Dimasak' },
    { code: 'air_keruh_diendapkan', text: 'Air baku keruh diendapkan/disaring' },
    { code: 'air_disimpan_tertutup', text: 'Air disimpan tertutup' },
  ],
  pengelolaan_pangan: [
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

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
    if (typeof window === 'undefined') return 'landscape'
    return window.matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(orientation: portrait)')
    const handler = (e: MediaQueryListEvent) => setOrientation(e.matches ? 'portrait' : 'landscape')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return orientation
}

function validatePasswordStrength(password: string): string | null {
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar.'
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung angka.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password harus mengandung simbol.'
  return null
}

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
  const [entries] = useState<Entry[]>([])
  const [users] = useState<UserProfile[]>([])
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const { t } = useTranslation()
  const orientation = useOrientation()
  const reloadLocations = useCallback(async () => {
    if (isDemoMode) {
      // In demo mode, load from localStorage
      try {
        const savedLocations = localStorage.getItem('sigesit_demo_locations')
        if (savedLocations) {
          const mapped = JSON.parse(savedLocations) as Location[]
          mapped.sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { numeric: true, sensitivity: 'base' }))
          setLocations(mapped)
          console.log('Demo mode: Locations loaded from localStorage:', mapped.length)
        } else {
          setLocations([])
          console.log('Demo mode: No locations in localStorage')
        }
      } catch (err) {
        console.error('Demo mode: Error loading locations from localStorage:', err)
        setLocations([])
      }
      return
    }

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
  }, [isDemoMode])
  const [pkmInfo, setPkmInfo] = useState<PKMInfo | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changePasswordSubmitting, setChangePasswordSubmitting] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Check for demo mode on mount
  useEffect(() => {
    try {
      const demoMode = localStorage.getItem('sigesit_demo_mode')
      const demoUser = localStorage.getItem('sigesit_demo_user')
      console.log('Checking demo mode on mount:', { demoMode, demoUser })
      if (demoMode === 'true' && demoUser?.toLowerCase() === 'demo@sigesit.local') {
        console.log('Activating demo mode')
        setIsDemoMode(true)
        // Set demo profile
        const demoProfile: UserProfile = {
          id: 'demo-user-id',
          fullName: 'Demo User',
          username: 'demo@sigesit.local',
          nik: '0000000000000001',
          phone: '081234567890',
          email: 'demo@sigesit.local',
          role: 'super_admin',
          isActive: true,
          moduleAccess: {
            entry: true,
            wilayah: true,
            pengguna: true,
            lokasi: true,
            uji_air: true,
            uji_udara: true,
            pangan: true,
            group_tpp: true
          }
        }
        setProfile(demoProfile)
        setAuthReady(true)
        
        // Load demo data from localStorage if available
        loadDemoData()
      }
    } catch (e) {
      console.error('Failed to check demo mode:', e)
    }
  }, [])

  // Load demo data from localStorage
  const loadDemoData = useCallback(() => {
    try {
      const savedLocations = localStorage.getItem('sigesit_demo_locations')
      const savedWaterTests = localStorage.getItem('sigesit_demo_water_tests')
      const savedAirTests = localStorage.getItem('sigesit_demo_air_tests')
      const savedFoodInspections = localStorage.getItem('sigesit_demo_food_inspections')
      const savedKelurahan = localStorage.getItem('sigesit_demo_kelurahan')
      const savedRw = localStorage.getItem('sigesit_demo_rw')
      const savedRt = localStorage.getItem('sigesit_demo_rt')

      if (savedLocations) setLocations(JSON.parse(savedLocations))
      if (savedWaterTests) setWaterTests(JSON.parse(savedWaterTests))
      if (savedAirTests) setAirTests(JSON.parse(savedAirTests))
      if (savedFoodInspections) setFoodInspections(JSON.parse(savedFoodInspections))
      if (savedKelurahan) setKelurahan(JSON.parse(savedKelurahan))
      if (savedRw) setRw(JSON.parse(savedRw))
      if (savedRt) setRt(JSON.parse(savedRt))
      setRegionsLoaded(true)
    } catch (e) {
      console.error('Failed to load demo data:', e)
    }
  }, [])

  // Save demo data to localStorage
  const saveDemoData = useCallback(() => {
    if (!isDemoMode) return
    try {
      localStorage.setItem('sigesit_demo_locations', JSON.stringify(locations))
      localStorage.setItem('sigesit_demo_water_tests', JSON.stringify(waterTests))
      localStorage.setItem('sigesit_demo_air_tests', JSON.stringify(airTests))
      localStorage.setItem('sigesit_demo_food_inspections', JSON.stringify(foodInspections))
      localStorage.setItem('sigesit_demo_kelurahan', JSON.stringify(kelurahan))
      localStorage.setItem('sigesit_demo_rw', JSON.stringify(rw))
      localStorage.setItem('sigesit_demo_rt', JSON.stringify(rt))
    } catch (e) {
      console.error('Failed to save demo data:', e)
    }
  }, [isDemoMode, locations, waterTests, airTests, foodInspections, kelurahan, rw, rt])

  // Clear demo data on logout
  const clearDemoData = useCallback(() => {
    try {
      const demoUser = localStorage.getItem('sigesit_demo_user')
      if (demoUser?.toLowerCase() === 'demo@sigesit.local') {
        localStorage.removeItem('sigesit_demo_mode')
        localStorage.removeItem('sigesit_demo_user')
        localStorage.removeItem('sigesit_demo_locations')
        localStorage.removeItem('sigesit_demo_water_tests')
        localStorage.removeItem('sigesit_demo_air_tests')
        localStorage.removeItem('sigesit_demo_food_inspections')
        localStorage.removeItem('sigesit_demo_kelurahan')
        localStorage.removeItem('sigesit_demo_rw')
        localStorage.removeItem('sigesit_demo_rt')
      }
      setIsDemoMode(false)
      setProfile(null)
      window.location.reload()
    } catch (e) {
      console.error('Failed to clear demo data:', e)
    }
  }, [])

  // Auto-save demo data when it changes
  useEffect(() => {
    if (isDemoMode) {
      try {
        localStorage.setItem('sigesit_demo_locations', JSON.stringify(locations))
        localStorage.setItem('sigesit_demo_water_tests', JSON.stringify(waterTests))
        localStorage.setItem('sigesit_demo_air_tests', JSON.stringify(airTests))
        localStorage.setItem('sigesit_demo_food_inspections', JSON.stringify(foodInspections))
        localStorage.setItem('sigesit_demo_kelurahan', JSON.stringify(kelurahan))
        localStorage.setItem('sigesit_demo_rw', JSON.stringify(rw))
        localStorage.setItem('sigesit_demo_rt', JSON.stringify(rt))
      } catch (e) {
        console.error('Failed to save demo data:', e)
      }
    }
  }, [isDemoMode, locations, waterTests, airTests, foodInspections, kelurahan, rw, rt])

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

    const strengthError = validatePasswordStrength(newPassword)
    if (strengthError) {
      setChangePasswordError(strengthError)
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
      
      // Update the is_temp_password flag in profiles
      const { error: profileError } = await supabase.from('profiles').update({
        is_temp_password: false
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

  async function handleLoginSuccess() {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      setSession(data.session)
      setAuthReady(true)
    }
  }

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadRegionsRef = useRef(loadRegions)
  loadRegionsRef.current = loadRegions
  const loadPKMInfoRef = useRef(loadPKMInfo)
  loadPKMInfoRef.current = loadPKMInfo
  const reloadLocationsRef = useRef(reloadLocations)
  reloadLocationsRef.current = reloadLocations

  useEffect(() => {
    if (!supabase || !session) return
    const db = supabase
    const channel = db
      .channel('realtime-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kelurahan' }, () => {
        loadRegionsRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rw' }, () => {
        loadRegionsRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rt' }, () => {
        loadRegionsRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pkm_info' }, () => {
        loadPKMInfoRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        reloadLocationsRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [session, supabase])

  useEffect(() => {
    const root = document.documentElement
    const theme = getThemeById(settings.theme)
    const c = theme.colors
    root.style.setProperty('--color-bg', c.bg)
    root.style.setProperty('--color-surface', c.surface)
    root.style.setProperty('--color-surface-alt', c.surfaceAlt)
    root.style.setProperty('--color-text', c.text)
    root.style.setProperty('--color-text-secondary', c.textSecondary)
    root.style.setProperty('--color-text-muted', c.textMuted)
    root.style.setProperty('--color-border', c.border)
    root.style.setProperty('--color-border-strong', c.borderStrong)
    root.style.setProperty('--color-primary', c.primary)
    root.style.setProperty('--color-primary-light', c.primaryLight)
    root.style.setProperty('--color-primary-bg', c.primaryBg)
    root.style.setProperty('--color-primary-hover', c.primaryHover)
    root.style.setProperty('--color-danger', c.danger)
    root.style.setProperty('--color-danger-bg', c.dangerBg)
    root.style.setProperty('--color-danger-hover', c.dangerHover)
    root.style.setProperty('--color-success', c.success)
    root.style.setProperty('--color-success-bg', c.successBg)
    root.style.setProperty('--color-warning', c.warning)
    root.style.setProperty('--color-warning-bg', c.warningBg)
    root.style.setProperty('--color-info', c.info)
    root.style.setProperty('--color-info-bg', c.infoBg)
    root.style.setProperty('--app-font', settings.fontFamily)
  }, [settings])

  useEffect(() => {
    async function loadProfile() {
      if (!supabase || !session) { setProfile(null); return }
      // Retry profile loading with delay if initial load fails
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        console.log('Load profile result:', { data, error: error?.message, userId: session.user.id, attempt: i + 1 })
        if (!error && data) {
          const profileData = mapProfileRow(data as ProfileRow)
          setProfile(profileData)
          // Show change password modal if user has temp password
          if (profileData.isTempPassword) {
            setShowChangePassword(true)
          }
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
        moduleAccess: { entry: true, wilayah: false, pengguna: false, lokasi: false, uji_air: false, uji_udara: false, pangan: false, group_tpp: false }
      })
    }
    void loadProfile()
  }, [session])

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

  useEffect(() => {
    void loadRegions()
  }, [session])

  useEffect(() => {
    if (regionsLoaded && !supabaseConfigured) localStorage.setItem('sigesit-regions', JSON.stringify({ kelurahan, rw, rt }))
  }, [kelurahan, rw, rt, regionsLoaded])

  useEffect(() => {
    if (profile) void reloadLocations()
  }, [profile, reloadLocations])

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

  useEffect(() => {
    void loadPKMInfo()
  }, [session])

  if (supabaseConfigured && !authReady && !isDemoMode) return <main className="auth-shell"><p className="auth-loading">Memuat sesi…</p></main>
  if (supabaseConfigured && !session && !isDemoMode) return <LoginPage onLoginSuccess={handleLoginSuccess} />

  const displayName = profile?.fullName ?? 'Syifa Zahra'
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const canAccessView = (viewName: string) => authCanAccessView(profile, viewName)
  const pkmName = pkmInfo?.namaPkm || 'SADAKELING PKM PADASUKA - KOTA CIMAHI'
  const pkmLogo = pkmInfo?.logoUrl

  return <main className={`app-shell orientation-${orientation}`}>
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
            <small style={{ display: 'block', marginTop: '-8px', marginBottom: '12px', color: '#6b7280', fontSize: '12px' }}>Password harus mengandung huruf besar, huruf kecil, angka, dan simbol.</small>
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
        {pkmLogo ? (
          <img src={pkmLogo} alt="Logo PKM" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'contain' }} />
        ) : (
          <div className="brand-mark">S</div>
        )}
        <div><strong>SIGESIT</strong><span>{pkmName}</span></div>
      </div>
      <div className="topbar-actions"><button className={`connection ${online ? 'online' : 'offline'}`} onClick={() => setOnline(!online)} type="button"><i />{online ? 'Terhubung' : 'Offline'}</button><button className="avatar" type="button" aria-label={`Profil ${displayName}`}>{initials || 'SZ'}</button>{(session || isDemoMode) && <button className="logout" onClick={() => { if (isDemoMode) { clearDemoData() } else { void supabase?.auth.signOut() } }} type="button">Keluar</button>}</div>
    </header>
    {isDemoMode && (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '48px',
        fontWeight: 'bold',
        color: 'rgba(255, 0, 0, 0.15)',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'nowrap',
        textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
      }}>
        DEMO MODE
      </div>
    )}
    {isDemoMode && (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(255, 193, 7, 0.95)',
        color: 'black',
        padding: '12px 20px',
        borderRadius: '8px',
        fontWeight: 'bold',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 10000,
        maxWidth: '300px',
        fontSize: '14px',
        border: '2px solid #ff9800'
      }}>
        ⚠️ Mode Demo: Data tidak tersimpan di server
      </div>
    )}
    <section className="workspace">
      <aside className="sidebar">
        {pkmLogo && (
          <div style={{ padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
            <img src={pkmLogo} alt="Logo PKM" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}
        <p className="side-label">{t.menu.main}</p><nav><button className={view === 'beranda' ? 'active' : ''} onClick={() => setView('beranda')} type="button"><span>⌂</span> {t.nav.home}</button>{canAccessView('entry') && <button className={view === 'entry' ? 'active' : ''} onClick={() => setView('entry')} type="button"><span>👨‍👩‍👧‍👦</span> {t.nav.entry}</button>}</nav>
        <p className="side-label">{t.menu.examination}</p><nav>{canAccessView('uji_air') && <button className={view === 'uji_air' ? 'active' : ''} onClick={() => setView('uji_air')} type="button"><span>💧</span> {t.nav.ujiAir}</button>}{canAccessView('uji_udara') && <button className={view === 'uji_udara' ? 'active' : ''} onClick={() => setView('uji_udara')} type="button"><span>🌬️</span> {t.nav.ujiUdara}</button>}{canAccessView('pangan') && <button className={view === 'pangan' ? 'active' : ''} onClick={() => setView('pangan')} type="button"><span>🍱</span> {t.nav.pangan}</button>}</nav>
        <p className="side-label">{t.menu.masterData}</p><nav>{canAccessView('wilayah') && <button className={view === 'wilayah' ? 'active' : ''} onClick={() => setView('wilayah')} type="button"><span>⌘</span> {t.nav.wilayah}</button>}{canAccessView('lokasi') && <button className={view === 'lokasi' ? 'active' : ''} onClick={() => setView('lokasi')} type="button"><span>📍</span> {t.nav.lokasi}</button>}{canManageUsers(profile) && <button className={view === 'pengguna' ? 'active' : ''} onClick={() => setView('pengguna')} type="button"><span>♙</span> {t.nav.pengguna}</button>}{canAccessView('group_tpp') && <button className={view === 'group_tpp' ? 'active' : ''} onClick={() => setView('group_tpp')} type="button"><span>📋</span> {t.nav.groupTpp}</button>}</nav>
        <p className="side-label">{t.menu.account}</p><nav>{isSuperAdmin(profile) ? (
          <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')} type="button"><span>🏥</span> {t.nav.profile}</button>
        ) : (
          <button className={view === 'profil_pengguna' ? 'active' : ''} onClick={() => setView('profil_pengguna')} type="button"><span>👤</span> {t.nav.profileUser}</button>
        )}<button className={view === 'pengaturan' ? 'active' : ''} onClick={() => setView('pengaturan')} type="button"><span>⚙️</span> {t.nav.settings}</button></nav>
      </aside>
      <section className="content">{(() => {
        if (view === 'beranda') return <Dashboard view={view} setView={setView} pkmInfo={pkmInfo} kelurahan={kelurahan} rw={rw} rt={rt} locations={locations} waterTests={waterTests} airTests={airTests} entries={entries} users={users} canAccessView={canAccessView} />
        if (view === 'profile') return <ProfilePage />
        if (view === 'profil_pengguna') return <UserProfilePage profile={profile} />
        if (view === 'pengaturan') return <SettingsPage onSave={setSettings} />
        if (view === 'unauthorized') return <UnauthorizedPage />
        if (!canAccessView(view)) return <UnauthorizedPage />
        if (view === 'entry') return <EntryPage profile={profile} kelurahan={kelurahan} rw={rw} rt={rt} />
        if (view === 'wilayah') return <WilayahPage kelurahan={kelurahan} rw={rw} rt={rt} setKelurahan={setKelurahan} setRw={setRw} setRt={setRt} />
        if (view === 'pengguna') return <PenggunaPage kelurahan={kelurahan} rw={rw} rt={rt} currentUserId={session?.user.id} />
        if (view === 'lokasi') return <LokasiPage kelurahan={kelurahan} rw={rw} rt={rt} locations={locations} reloadLocations={reloadLocations} />
        if (view === 'uji_air') return <UjiAirPage profile={profile} locations={locations} kelurahan={kelurahan} waterTests={waterTests} setWaterTests={setWaterTests} />
        if (view === 'uji_udara') return <UjiUdaraPage profile={profile} locations={locations} kelurahan={kelurahan} airTests={airTests} setAirTests={setAirTests} />
        if (view === 'group_tpp') return <GroupTppPage profile={profile} />
        if (view === 'pangan') return <PanganPage profile={profile} kelurahan={kelurahan} rw={rw} rt={rt} foodInspections={foodInspections} setFoodInspections={setFoodInspections} />
        return <Dashboard view={view} setView={setView} pkmInfo={pkmInfo} kelurahan={kelurahan} rw={rw} rt={rt} locations={locations} waterTests={waterTests} airTests={airTests} entries={entries} users={users} canAccessView={canAccessView} />
      })()}</section>
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
  
  // Check demo mode
  const isDemoMode = useMemo(() => {
    try {
      return localStorage.getItem('sigesit_demo_mode') === 'true'
    } catch {
      return false
    }
  }, [])
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
      if (isDemoMode) {
        // In demo mode, load from localStorage
        setLoading(true)
        try {
          console.log('Demo mode: Reloading regions from localStorage...')
          const savedKelurahan = localStorage.getItem('sigesit_demo_kelurahan')
          const savedRw = localStorage.getItem('sigesit_demo_rw')
          const savedRt = localStorage.getItem('sigesit_demo_rt')

          if (savedKelurahan) setKelurahan(JSON.parse(savedKelurahan))
          if (savedRw) setRw(JSON.parse(savedRw))
          if (savedRt) setRt(JSON.parse(savedRt))
          
          console.log('Demo mode: Regions reloaded successfully')
        } catch (err) {
          console.error('Demo mode: Error reloading regions:', err)
        } finally {
          setLoading(false)
        }
        return
      }

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
    
    if (isDemoMode) {
      // In demo mode, save to localStorage only
      try {
        if (level === 'kelurahan') {
          const updatedKelurahan = editing ? kelurahan.map((current) => current.id === item.id ? item : current) : [...kelurahan, item]
          setKelurahan(updatedKelurahan)
          localStorage.setItem('sigesit_demo_kelurahan', JSON.stringify(updatedKelurahan))
        } else if (level === 'rw') {
          let updatedRw = editing ? rw.map((current) => current.id === item.id ? item : current) : [...rw, item]
          updatedRw.sort((a, b) => {
            const kelurahanA = kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === a.kelurahanId)?.name || ''
            const kelurahanB = kelurahan.find((k: { id: string; name: string; code?: string }) => k.id === b.kelurahanId)?.name || ''
            if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
            const numA = parseInt(a.name, 10) || 0
            const numB = parseInt(b.name, 10) || 0
            return numA - numB
          })
          setRw(updatedRw)
          localStorage.setItem('sigesit_demo_rw', JSON.stringify(updatedRw))
        } else if (level === 'rt') {
          let updatedRt = editing ? rt.map((current) => current.id === item.id ? item : current) : [...rt, item]
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
          localStorage.setItem('sigesit_demo_rt', JSON.stringify(updatedRt))
        }
        setFormOpen(false)
        setEditing(null)
        return
      } catch (err) {
        console.error('Demo mode: Error saving region:', err)
        window.alert('Data gagal disimpan di mode demo')
        return
      }
    }
    
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
    
    if (isDemoMode) {
      // In demo mode, remove from localStorage only
      try {
        if (level === 'kelurahan') {
          const updatedKelurahan = kelurahan.filter((current) => current.id !== item.id)
          setKelurahan(updatedKelurahan)
          localStorage.setItem('sigesit_demo_kelurahan', JSON.stringify(updatedKelurahan))
        } else if (level === 'rw') {
          const updatedRw = rw.filter((current) => current.id !== item.id)
          setRw(updatedRw)
          localStorage.setItem('sigesit_demo_rw', JSON.stringify(updatedRw))
        } else if (level === 'rt') {
          const updatedRt = rt.filter((current) => current.id !== item.id)
          setRt(updatedRt)
          localStorage.setItem('sigesit_demo_rt', JSON.stringify(updatedRt))
        }
        return
      } catch (err) {
        console.error('Demo mode: Error removing region:', err)
        window.alert('Data gagal dihapus di mode demo')
        return
      }
    }
    
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
            <table className="data-table">
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
                        <button className="edit-button" onClick={() => openForm(item)} type="button">Edit</button>
                        <button className="delete-button" onClick={() => remove(item)} type="button">Hapus</button>
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

function Dashboard({ view, setView, pkmInfo, kelurahan, rw, rt, locations, waterTests, airTests, entries, users, canAccessView }: { 
  view: View; 
  setView: (view: View) => void; 
  pkmInfo: PKMInfo | null;
  kelurahan: Region[];
  rw: Region[];
  rt: Region[];
  locations: Location[];
  waterTests: WaterQualityTest[];
  airTests: AirQualityTest[];
  entries: Entry[];
  users: UserProfile[];
  canAccessView: (viewName: string) => boolean;
}) {
  const title = 'Selamat pagi, Syifa.'
  const pkmName = pkmInfo?.namaPkm || 'PKM Padasuka'
  
  const totalWilayah = useMemo(() => kelurahan.length + rw.length + rt.length, [kelurahan.length, rw.length, rt.length])
  const totalKelurahan = useMemo(() => kelurahan.length, [kelurahan.length])
  const totalRw = useMemo(() => rw.length, [rw.length])
  const totalRt = useMemo(() => rt.length, [rt.length])
  const totalLokasi = useMemo(() => locations.length, [locations.length])
  const totalUjiAir = useMemo(() => waterTests.length, [waterTests.length])
  const totalUjiUdara = useMemo(() => airTests.length, [airTests.length])
  const totalEntries = useMemo(() => entries.length, [entries.length])
  const totalPengguna = useMemo(() => users.length, [users.length])
  
  const last7Days = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d
  }, [])
  
  const newEntriesLast7Days = useMemo(() => entries.filter(e => new Date(e.entryDate) >= last7Days).length, [entries, last7Days])
  const newWaterTestsLast7Days = useMemo(() => waterTests.filter(e => new Date(e.testDate) >= last7Days).length, [waterTests, last7Days])
  const newAirTestsLast7Days = useMemo(() => airTests.filter(e => new Date(e.testDate) >= last7Days).length, [airTests, last7Days])
  
  const lastUpdate = useMemo(() => {
    const getDate = (item: any) => {
      if (item.testDate) return new Date(item.testDate).getTime()
      if (item.entryDate) return new Date(item.entryDate).getTime()
      if (item.createdAt) return new Date(item.createdAt).getTime()
      return 0
    }
    const allItems = [...waterTests, ...airTests, ...entries]
    return allItems.sort((a, b) => getDate(b) - getDate(a))[0]
  }, [waterTests, airTests, entries])
  
  const lastUpdateTime = useMemo(() => {
    if (!lastUpdate) return '-'
    const getDate = (item: any) => {
      if (item.testDate) return new Date(item.testDate).getTime()
      if (item.entryDate) return new Date(item.entryDate).getTime()
      if (item.createdAt) return new Date(item.createdAt).getTime()
      return 0
    }
    return new Date(getDate(lastUpdate)).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }, [lastUpdate])

  if (view !== 'beranda') return <section className="master-page"><div className="page-heading"><div><p className="eyebrow">DATA MASTER</p><h1>{view === 'wilayah' ? 'Data Wilayah' : view === 'pengguna' ? 'Pengguna Kader & Relawan' : view === 'lokasi' ? 'Data Lokasi' : view === 'uji_air' ? 'Uji Kualitas Air' : view === 'uji_udara' ? 'Uji Kualitas Udara' : view === 'group_tpp' ? 'Group / Jenis TPP' : view === 'pangan' ? 'Hasil Pemeriksaan Pangan/Makanan' : 'Entry Data'}</h1><p>Kelola data yang digunakan oleh seluruh petugas lapangan.</p></div></div></section>
  return <><div className="page-heading dashboard-heading"><div><p className="eyebrow">DASHBOARD LAPANGAN</p><h1>{title}</h1><p>Berikut ringkasan pendataan wilayah kerja {pkmName} hari ini.</p></div><button className="primary" onClick={() => setView('entry')} type="button">+ Input data rumah</button></div>
  
  {/* Grid Statistik Utama */}
  <div className="stat-grid">
    {canAccessView('wilayah') && <article className="stat-card clickable" onClick={() => setView('wilayah')}>
      <span className="stat-icon blue">⌘</span>
      <div>
        <p>Total Wilayah</p>
        <strong>{totalWilayah}</strong>
        <small>{totalKelurahan} Kel, {totalRw} RW, {totalRt} RT</small>
      </div>
    </article>}
    {canAccessView('lokasi') && <article className="stat-card clickable" onClick={() => setView('lokasi')}>
      <span className="stat-icon teal">📍</span>
      <div>
        <p>Lokasi Terdaftar</p>
        <strong>{totalLokasi}</strong>
        <small>Semua titik lokasi aktif</small>
      </div>
    </article>}
    {canAccessView('uji_air') && <article className="stat-card clickable" onClick={() => setView('uji_air')}>
      <span className="stat-icon cyan">💧</span>
      <div>
        <p>Uji Kualitas Air</p>
        <strong>{totalUjiAir}</strong>
        <small>+{newWaterTestsLast7Days} 7 hari terakhir</small>
      </div>
    </article>}
    {canAccessView('uji_udara') && <article className="stat-card clickable" onClick={() => setView('uji_udara')}>
      <span className="stat-icon purple">🌬️</span>
      <div>
        <p>Uji Kualitas Udara</p>
        <strong>{totalUjiUdara}</strong>
        <small>+{newAirTestsLast7Days} 7 hari terakhir</small>
      </div>
    </article>}
    {canAccessView('entry') && <article className="stat-card clickable" onClick={() => setView('entry')}>
      <span className="stat-icon gold">⌂</span>
      <div>
        <p>Rumah Terdata</p>
        <strong>{totalEntries}</strong>
        <small>+{newEntriesLast7Days} minggu ini</small>
      </div>
    </article>}
    {canAccessView('pengguna') && <article className="stat-card clickable" onClick={() => setView('pengguna')}>
      <span className="stat-icon coral">👥</span>
      <div>
        <p>Kader & Relawan</p>
        <strong>{totalPengguna}</strong>
        <small>Petugas aktif</small>
      </div>
    </article>}
  </div>

  {/* Status Terakhir */}
  <div className="status-banner">
    <div className="status-item">
      <span className="status-dot synced"></span>
      <span>Data Terakhir: {lastUpdateTime} WIB</span>
    </div>
    <div className="status-item">
      <span className="status-dot synced"></span>
      <span>Semua data tersinkronisasi</span>
    </div>
  </div>

  {/* Aktivitas Terbaru */}
  <section className="section-head">
    <div>
      <h2>Aktivitas terbaru</h2>
      <p>Data rumah tangga yang Anda entri hari ini</p>
    </div>
    <button className="text-button" onClick={() => setView('entry')} type="button">Lihat semua</button>
  </section>
  <section className="entry-list">
    {entries.slice(0, 5).map((entry) => {
      // Dapatkan nama kelurahan untuk ditampilkan
      const kelurahanName = kelurahan.find(k => k.id === entry.kelurahanId)?.name || 'Unknown'
      const entryTime = new Date(entry.entryDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      return (
        <article className="entry-row" key={entry.id}>
          <div className="house-icon">⌂</div>
          <div className="entry-detail">
            <strong>Entry #{entry.entryNumber}</strong>
            <span>{entry.id} · {kelurahanName}</span>
          </div>
          <div className="entry-status">
            <span className="status synced">Tersinkron</span>
            <small>{entryTime} WIB</small>
          </div>
        </article>
      )
    })}
    {entries.length === 0 && (
      <div className="empty-state small">
        <span>⌂</span>
        <h3>Belum ada entri data</h3>
        <p>Mulai input data rumah tangga Anda hari ini.</p>
      </div>
    )}
  </section></>
}

function EntryPage({ profile, kelurahan, rw, rt }: { profile: UserProfile | null; kelurahan: Region[]; rw: Region[]; rt: Region[] }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [nextEntryNumber, setNextEntryNumber] = useState(1)
  
  // Filter regions based on user profile
  const userKelurahan = profile?.kelurahanId ? kelurahan.filter(k => k.id === profile.kelurahanId) : kelurahan
  const userRw = profile?.rwId ? rw.filter(r => r.id === profile.rwId) : 
                profile?.kelurahanId ? rw.filter(r => r.kelurahanId === profile.kelurahanId) : rw
  const userRt = profile?.rtId ? rt.filter(r => r.id === profile.rtId) : 
                profile?.rwId ? rt.filter(r => r.rwId === profile.rwId) : 
                profile?.kelurahanId ? rt.filter(r => {
                  const rwItem = rw.find(rw => rw.id === r.rwId)
                  return rwItem?.kelurahanId === profile.kelurahanId
                }) : rt

  const [selectedKelurahanId, setSelectedKelurahanId] = useState(profile?.kelurahanId || '')
  const [selectedRwId, setSelectedRwId] = useState(profile?.rwId || '')
  const [selectedRtId, setSelectedRtId] = useState(profile?.rtId || '')
  const [familyCards, setFamilyCards] = useState<FamilyCard[]>([])
  const [questionnaireResponses, setQuestionnaireResponses] = useState<QuestionnaireResponse[]>([])
  const [currentKkIndex, setCurrentKkIndex] = useState(0)

  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [freeSearch, setFreeSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const debouncedFreeSearch = useDebounce(freeSearch, 150)

  const filteredEntries = entries.filter((entry) => {
    if (dateFrom && entry.entryDate < dateFrom) return false
    if (dateTo && entry.entryDate > dateTo) return false
    if (filterKelurahanId && entry.kelurahanId !== filterKelurahanId) return false
    if (debouncedFreeSearch.trim()) {
      const q = debouncedFreeSearch.trim().toLowerCase()
      const searchText = [
        entry.entryNumber.toString(),
        entry.entryDate,
        ...entry.familyCards.map(fc => `${fc.kepalaKeluarga} ${fc.kkNumber} ${fc.address}`),
      ].join(' ').toLowerCase()
      return searchText.includes(q)
    }
    return true
  })

  async function loadEntries() {
    if (!supabase || !profile) {
      console.log('loadEntries: supabase or profile missing', { supabase: !!supabase, profile: !!profile })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = supabase.from('entries').select('*')
      if (isKader(profile)) {
        query = query.eq('created_by', profile.id)
      }
      const { data, error } = await query.order('entry_date', { ascending: false })
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
      // Load family cards and questionnaire responses for each entry
      const entriesWithDetails = await Promise.all(
        data.map(async (entry: EntryRow) => {
          const { data: fcData } = await supabase!.from('family_cards').select('*').eq('entry_id', entry.id)
          const { data: qrData } = await supabase!.from('questionnaire_responses').select('*').in('family_card_id', fcData?.map((fc: any) => fc.id) || [])
          const mapped = mapEntryRow(entry)
          return {
            ...mapped,
            familyCards: (fcData || []).map((fc: any) => ({
              id: fc.id,
              entryId: fc.entry_id,
              kkSequence: fc.kk_sequence,
              kkNumber: fc.kk_number,
              kepalaKeluarga: fc.kepala_keluarga || '',
              address: fc.address,
              totalJiwa: fc.total_jiwa,
              jiwaMenetap: fc.jiwa_menetap,
              jambanCount: fc.jamban_count
            })),
            questionnaireResponses: qrData || []
          }
        })
      )
      setEntries(entriesWithDetails)
      // Update next entry number after loading all entries, pass the loaded entries directly
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
      const localMaxEntryNumber = currentEntries.length > 0 ? Math.max(...currentEntries.map(e => e.entryNumber)) : 0
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
      const nextNumber = Math.max(rpcValue, localMaxEntryNumber + 1)
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
    void getNextEntryNumber()
  }, [profile])

  const loadEntriesRef = useRef(loadEntries)
  loadEntriesRef.current = loadEntries

  useEffect(() => {
    if (!supabase || !profile) return
    const db = supabase
    const channel = db
      .channel('entries-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => {
        loadEntriesRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [profile, supabase])

  function openForm(entry?: Entry) {
    setEditing(entry ?? null)
    setError('')
    setSelectedKelurahanId(entry?.kelurahanId || profile?.kelurahanId || '')
    setSelectedRwId(entry?.rwId || profile?.rwId || '')
    setSelectedRtId(entry?.rtId || profile?.rtId || '')
    setFamilyCards(entry?.familyCards || [])
    setQuestionnaireResponses(entry?.questionnaireResponses || [])
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
      kepalaKeluarga: familyCards.length === 0 ? 'Kepala Keluarga Utama' : '',
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
        // Create entry - created_by is auto-set by DB trigger for non-super-admin users,
        // but we also set it explicitly to enforce kader data isolation at the application layer
        const { data: newEntry, error: entryError } = await supabase.from('entries').insert({
          entry_number: nextEntryNumber,
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
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah Entry</button>
    </div>

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
          <div key={index} className="kk-card" style={{ border: currentKkIndex === index ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', padding: '16px', marginBottom: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <strong>{index === 0 ? '🏠 Kepala Keluarga Utama' : `KK #${fc.kkSequence}`}</strong>
              <button className="text-button" onClick={() => removeFamilyCard(index)} type="button">Hapus</button>
            </div>
            <div className="form-grid">
              <label>No. KK<input value={fc.kkNumber} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].kkNumber = e.target.value
                setFamilyCards(updated)
              }} placeholder="16 digit nomor KK" required /></label>
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
              }} inputMode="numeric" disabled={fc.jambanCount === 0} /></label>
            </div>

            <button className="text-button" onClick={() => setCurrentKkIndex(index)} type="button">
              {currentKkIndex === index ? 'Sedang mengisi questionnaire' : 'Isi questionnaire untuk KK ini'}
            </button>

            {currentKkIndex === index && (
              <div style={{ marginTop: '16px' }}>
                {Object.entries(questionnaireData).map(([pillar, questions]) => (
                  <div key={pillar} style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '12px', textTransform: 'capitalize' }}>{pillar.replace(/_/g, ' ')}</h3>
                    {questions.map(q => {
                      const tempFamilyCardId = fc.id || `temp-${index}`
                      const isSingleChoice = pillar === 'jamban' || pillar === 'sumber_air'
                      const isDropdown = ['bab_di_jamban', 'jamban_milik_sendiri', 'kloset_leher_angsa'].includes(q.code)
                      const currentAnswer = questionnaireResponses.find(qr => 
                        qr.familyCardId === tempFamilyCardId && qr.pillar === pillar && qr.questionCode === q.code
                      )?.answer || false
                      if (isDropdown) {
                        return (
                          <div key={q.code} style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                              <span style={{ flex: '1 0 180px' }}>{q.text}</span>
                              <select
                                value={currentAnswer ? 'yes' : 'no'}
                                onChange={(e) => handleQuestionnaireChange(pillar, q.code, e.target.value === 'yes')}
                                className="q-select"
                              >
                                <option value="no">Tidak</option>
                                <option value="yes">Ya</option>
                              </select>
                            </label>
                          </div>
                        )
                      }
                      return (
                        <div key={q.code} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type={isSingleChoice ? 'radio' : 'checkbox'}
                              name={`${pillar}-${tempFamilyCardId}`}
                              checked={currentAnswer}
                              onChange={(e) => {
                                if (isSingleChoice) {
                                  // For radio buttons: clear all other answers in this pillar
                                  setQuestionnaireResponses(prev => {
                                    const filtered = prev.filter(qr => 
                                      !(qr.familyCardId === tempFamilyCardId && qr.pillar === pillar)
                                    )
                                    return [...filtered, {
                                      id: '',
                                      familyCardId: tempFamilyCardId,
                                      pillar,
                                      questionCode: q.code,
                                      answer: true
                                    }]
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
        <div className="form-section filter-bar-section">
          <div className="filter-bar">
            <div className="filter-field">
              <label>Tanggal Awal</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Tanggal Akhir</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Filter Kelurahan</label>
              <select value={filterKelurahanId} onChange={(e) => setFilterKelurahanId(e.target.value)}>
                <option value="">Semua Kelurahan</option>
                {kelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="filter-search">
              <label>Pencarian</label>
              <div className="search-inline">
                <input type="text" value={freeSearch} onChange={(e) => setFreeSearch(e.target.value)} placeholder="Cari data..." />
                <button className="reset-btn" onClick={() => { setFilterKelurahanId(''); setFreeSearch(''); setDateFrom(''); setDateTo('') }} type="button">Reset</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Menampilkan {filteredEntries.length} dari {entries.length} data
          </div>
        </div>

        <section className="entry-list">
          {filteredEntries.map(entry => (
        <article className="entry-row" key={entry.id}>
          <div className="house-icon">⌂</div>
          <div className="entry-detail">
            <strong>Entry #{entry.entryNumber}</strong>
            <span>{entry.entryDate} · {entry.familyCards.length} KK</span>
          </div>
          <div className="entry-actions">
            <button className="edit-button" onClick={() => openForm(entry)} type="button">Edit</button>
            <button className="delete-button" onClick={() => deleteEntry(entry)} type="button">Hapus</button>
          </div>
        </article>
      ))}
    </section>
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
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
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

function UserProfilePage({ profile }: { profile: UserProfile | null }) {

  if (!profile) {
    return <main className="auth-shell"><p className="auth-loading">Memuat profil pengguna…</p></main>
  }

  const getRoleLabel = (role: UserRole) => ROLE_LABELS[role]
  const getRoleBadgeClass = (role: UserRole) => role === 'super_admin' ? 'badge-super' : role === 'admin' ? 'badge-admin' : 'badge-kader'
  const getStatusLabel = (isActive: boolean) => isActive ? 'Aktif' : 'Nonaktif'
  const getStatusClass = (isActive: boolean) => isActive ? 'status-active' : 'status-inactive'

  return <section className="master-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">PROFIL PENGGUNA</p>
        <h1>Profil Saya</h1>
        <p>Informasi akun dan hak akses modul Anda di SIGESIT.</p>
      </div>
    </div>

    <div className="form-section" style={{ maxWidth: '700px' }}>
      <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px', padding: '24px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div className="avatar-large" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '28px', fontWeight: '600' }}>
          {profile.fullName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
        </div>
        <div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>{profile.fullName}</h2>
          <p style={{ margin: '0 0 8px 0', color: '#6b7280' }}>{profile.username}</p>
          <span className={`role-badge ${getRoleBadgeClass(profile.role)}`} style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: profile.role === 'super_admin' ? '#fef3c7' : profile.role === 'admin' ? '#dcfce7' : '#dbeafe', color: profile.role === 'super_admin' ? '#92400e' : profile.role === 'admin' ? '#166534' : '#1e40af' }}>
            {getRoleLabel(profile.role)}
          </span>
        </div>
      </div>

      <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <div className="profile-field">
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NIK</label>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{profile.nik}</p>
        </div>
        <div className="profile-field">
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No. HP</label>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{profile.phone}</p>
        </div>
        <div className="profile-field">
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{profile.email || '-'}</p>
        </div>
        <div className="profile-field">
          <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Akun</label>
          <span className={`status-badge ${getStatusClass(profile.isActive)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', background: profile.isActive ? '#dcfce7' : '#fee2e2', color: profile.isActive ? '#166534' : '#991b1b' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: profile.isActive ? '#22c55e' : '#ef4444' }}></span>
            {getStatusLabel(profile.isActive)}
          </span>
        </div>
      </div>

      <div className="profile-section" style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#374151' }}>Wilayah Tugas</h3>
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="profile-field">
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kelurahan</label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{profile.kelurahanId ? 'Ditetapkan' : 'Belum ditetapkan'}</p>
          </div>
          <div className="profile-field">
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RW</label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{profile.rwId ? 'Ditetapkan' : 'Belum ditetapkan'}</p>
          </div>
          <div className="profile-field">
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>RT</label>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>{profile.rtId ? 'Ditetapkan' : 'Belum ditetapkan'}</p>
          </div>
        </div>
      </div>

      <div className="profile-section" style={{ marginTop: '32px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '18px', color: '#374151' }}>Hak Akses Modul</h3>
        <div className="module-access" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {Object.entries(profile.moduleAccess).map(([key, value]) => {
            const labels: Record<string, string> = {
              entry: '👨‍👩‍👧‍👦 Entry Data',
              wilayah: '⌘ Wilayah',
              pengguna: '♙ Pengguna',
              lokasi: '📍 Lokasi',
              uji_air: '💧 Uji Air',
              uji_udara: '🌬️ Uji Udara',
              pangan: '🍱 Pangan',
              group_tpp: '📋 Group TPP',
            }
            return (
              <label key={key} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: value ? '#dbeafe' : '#f9fafb', borderRadius: '8px', border: `1px solid ${value ? '#93c5fd' : '#e5e7eb'}` }}>
                <input 
                  checked={value} 
                  disabled
                  type="checkbox" 
                  style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                />
                <span style={{ fontWeight: value ? '600' : '400', color: value ? '#1e40af' : '#6b7280' }}>{labels[key] || key}</span>
              </label>
            )
          })}
        </div>
        <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>Modul dengan ceklis hijau = Anda memiliki akses. Hubungi admin untuk perubahan hak akses.</p>
      </div>

      {profile.isTempPassword && (
        <div className="alert" style={{ marginTop: '24px', padding: '16px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', color: '#92400e' }}>
          <strong>⚠️ Perhatian:</strong> Anda masih menggunakan kata sandi sementara. Silakan ubah kata sandi Anda di menu Pengaturan untuk keamanan akun.
        </div>
      )}
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
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [freeSearch, setFreeSearch] = useState('')
  const debouncedFreeSearch = useDebounce(freeSearch, 150)
  
  // Check demo mode
  const isDemoMode = useMemo(() => {
    try {
      return localStorage.getItem('sigesit_demo_mode') === 'true'
    } catch {
      return false
    }
  }, [])

  function toSearchableText(location: Location): string {
    const kelName = kelurahan.find(k => k.id === location.kelurahanId)?.name ?? ''
    const rwName = location.rwId ? rw.find(r => r.id === location.rwId)?.name ?? '' : ''
    const rtName = location.rtId ? rt.find(r => r.id === location.rtId)?.name ?? '' : ''
    return [
      location.name,
      location.code ?? '',
      location.address ?? '',
      kelName,
      rwName,
      rtName,
      String(location.latitude ?? ''),
      String(location.longitude ?? ''),
      location.description ?? '',
    ].join(' ').toLowerCase()
  }

  const filteredLocations = locations.filter((location) => {
    if (filterKelurahanId && location.kelurahanId !== filterKelurahanId) {
      return false
    }
    if (debouncedFreeSearch.trim()) {
      const q = debouncedFreeSearch.trim().toLowerCase()
      return toSearchableText(location).includes(q)
    }
    return true
  })
  
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

      if (isDemoMode) {
        // In demo mode, save to localStorage only
        const newLocation: Location = {
          id: editing?.id || `location-${Date.now()}`,
          name: payload.name,
          code: payload.code,
          address: payload.address,
          kelurahanId: payload.kelurahan_id,
          rwId: payload.rw_id,
          rtId: payload.rt_id,
          latitude: payload.latitude,
          longitude: payload.longitude,
          description: payload.description
        }
        
        let updatedLocations: Location[]
        if (editing) {
          updatedLocations = locations.map(loc => loc.id === editing.id ? newLocation : loc)
        } else {
          updatedLocations = [...locations, newLocation]
        }
        
        // Sort locations
        updatedLocations.sort((a, b) => a.name.localeCompare(b.name, 'id-ID', { numeric: true, sensitivity: 'base' }))
        
        // Save to localStorage - this will trigger the parent state update via the useEffect in App
        localStorage.setItem('sigesit_demo_locations', JSON.stringify(updatedLocations))
        
        setFormOpen(false)
        await reloadLocations()
        return
      }

      if (!supabase) return
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
    
    if (isDemoMode) {
      // In demo mode, remove from localStorage only
      try {
        const updatedLocations = locations.filter(loc => loc.id !== location.id)
        localStorage.setItem('sigesit_demo_locations', JSON.stringify(updatedLocations))
        await reloadLocations()
        return
      } catch (err) {
        console.error('Demo mode: Error removing location:', err)
        window.alert('Gagal menghapus lokasi di mode demo')
        return
      }
    }

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
      <div className="form-section filter-bar-section">
        <div className="filter-bar">
          <div className="filter-field">
            <label>Filter Kelurahan</label>
            <select 
              value={filterKelurahanId} 
              onChange={(e) => setFilterKelurahanId(e.target.value)}
            >
              <option value="">Semua Kelurahan</option>
              {kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="filter-search">
            <label>Pencarian</label>
            <div className="search-inline">
              <input
                type="text"
                value={freeSearch}
                onChange={(e) => setFreeSearch(e.target.value)}
                placeholder="Cari nama, kode, alamat, wilayah..."
              />
              <button 
                className="reset-btn" 
                onClick={() => { setFilterKelurahanId(''); setFreeSearch('') }}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.875rem', color: 'var(--muted)' }}>
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
                      <button className="edit-button" onClick={() => openForm(location)} type="button">Edit</button>
                      <button className="delete-button" onClick={() => remove(location)} type="button">Hapus</button>
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
  const [filterLocationId, setFilterLocationId] = useState('')
  
  // Check demo mode
  const isDemoMode = useMemo(() => {
    try {
      return localStorage.getItem('sigesit_demo_mode') === 'true'
    } catch {
      return false
    }
  }, [])
  const [freeSearch, setFreeSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function toSearchableText(test: WaterQualityTest): string {
    const location = locations.find(l => l.id === test.locationId)
    const locName = location?.name ?? ''
    const locAddress = location?.address ?? ''
    const kelurahanData = kelurahan.find(k => k.id === location?.kelurahanId)
    const kelName = kelurahanData?.name ?? ''
    const values = [
      test.testDate,
      test.waterTemperatureValue, test.waterTemperatureUnit,
      test.airTemperatureValue, test.airTemperatureUnit,
      test.tdsValue, test.turbidityValue, test.colorValue, test.odorValue,
      test.phValue, test.nitriteValue, test.nitrateValue,
      test.chromiumValue, test.ironValue, test.manganeseValue,
      test.chlorineValue, test.fluorideValue, test.aluminumValue,
      test.eColiValue, test.coliformValue, test.notes,
    ]
    return [locName, locAddress, kelName, ...values.map(v => String(v ?? ''))].join(' ').toLowerCase()
  }

  const debouncedFreeSearch = useDebounce(freeSearch, 150)

  // Filter tests berdasarkan filter yang dipilih
  const filteredTests = tests.filter(test => {
    if (dateFrom && test.testDate < dateFrom) return false
    if (dateTo && test.testDate > dateTo) return false
    if (filterLocationId) {
      return test.locationId === filterLocationId
    }
    if (filterKelurahanId) {
      const location = locations.find(loc => loc.id === test.locationId)
      if (location?.kelurahanId !== filterKelurahanId) return false
    }
    if (debouncedFreeSearch.trim()) {
      const q = debouncedFreeSearch.trim().toLowerCase()
      return toSearchableText(test).includes(q)
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
    { key: 'waterTemperatureValue', label: 'Suhu Air' },
    { key: 'airTemperatureValue', label: 'Suhu Udara' },
    { key: 'tdsValue', label: 'TDS (mg/L)' },
    { key: 'turbidityValue', label: 'Kekeruhan (NTU)' },
    { key: 'colorValue', label: 'Warna' },
    { key: 'odorValue', label: 'Bau' },
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

  function isPositiveResult(value: string | number | null | undefined): boolean {
    if (value === null || value === undefined) return false
    const v = String(value).trim()
    return v.includes('>')
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
      'Lokasi',
      'Tanggal Uji',
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
        lokasiCell,
        test.testDate,
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
    if (isDemoMode) {
      // In demo mode, load from localStorage
      setLoading(true)
      try {
        console.log('Demo mode: Loading water quality tests from localStorage')
        const savedTests = localStorage.getItem('sigesit_demo_water_tests')
        if (savedTests) {
          setTests(JSON.parse(savedTests))
          console.log('Demo mode: Water quality tests loaded from localStorage:', JSON.parse(savedTests).length)
        } else {
          setTests([])
          console.log('Demo mode: No water quality tests in localStorage')
        }
      } catch (err) {
        console.error('Demo mode: Error loading water quality tests:', err)
        setError('Gagal memuat data uji air di mode demo')
        setTests([])
      } finally {
        setLoading(false)
      }
      return
    }

    if (!supabase || !profile) {
      console.error('Supabase or profile not available for water quality tests')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      console.log('Loading water quality tests for officer:', profile.id)
      const { data, error: loadError } = await supabase.from('water_quality_tests').select('*').eq('officer_id', profile.id).order('test_date', { ascending: false })
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

  // Only load tests after both profile and locations are available
  useEffect(() => {
    if (profile && locations.length > 0) {
      void loadTests()
    }
  }, [profile, locations, kelurahan])

  const loadTestsRef = useRef(loadTests)
  loadTestsRef.current = loadTests

  useEffect(() => {
    if (!supabase || !profile) return
    const db = supabase
    const channel = db
      .channel('water-tests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_quality_tests' }, () => {
        loadTestsRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [profile, supabase])

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

  function resetFormData() {
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
    if (!profile) return
    
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

    // Validasi input kolom entry (kecuali Catatan):
    // boleh angka, simbol perbandingan, dan tanda baca; huruf alfabet ditolak.
    for (const field of ujiAirEntryFields) {
      const value = String(formData[field.key] ?? '')
      if (!isUjiAirValueValid(value, 'final')) {
        setError(`Nilai ${field.label} boleh berisi angka, simbol (< atau >), dan tanda baca, tetapi tidak boleh mengandung huruf alfabet.`)
        setSubmitting(false)
        return
      }
    }

    if (isDemoMode) {
      // In demo mode, save to localStorage only
      try {
        const newTest: WaterQualityTest = {
          id: editing?.id || `water-test-${Date.now()}`,
          locationId: formData.locationId,
          testDate: formData.testDate,
          officerId: profile.id,
          waterTemperatureValue: formData.waterTemperatureValue,
          waterTemperatureUnit: formData.waterTemperatureUnit,
          airTemperatureValue: formData.airTemperatureValue,
          airTemperatureUnit: formData.airTemperatureUnit,
          tdsValue: formData.tdsValue,
          turbidityValue: formData.turbidityValue,
          colorValue: formData.colorValue,
          odorValue: formData.odorValue,
          phValue: formData.phValue,
          nitriteValue: formData.nitriteValue,
          nitrateValue: formData.nitrateValue,
          chromiumValue: formData.chromiumValue,
          ironValue: formData.ironValue,
          manganeseValue: formData.manganeseValue,
          chlorineValue: formData.chlorineValue,
          fluorideValue: formData.fluorideValue,
          aluminumValue: formData.aluminumValue,
          eColiValue: formData.eColiValue,
          coliformValue: formData.coliformValue,
          notes: formData.notes,
          createdAt: editing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        let updatedTests: WaterQualityTest[]
        if (editing) {
          updatedTests = tests.map(test => test.id === editing.id ? newTest : test)
        } else {
          updatedTests = [newTest, ...tests]
        }
        
        // Sort by test date descending
        updatedTests.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
        
        // Save to localStorage
        localStorage.setItem('sigesit_demo_water_tests', JSON.stringify(updatedTests))
        setTests(updatedTests)
        
        setFormOpen(false)
        setEditing(null)
        resetFormData()
        return
      } catch (err) {
        console.error('Demo mode: Error saving water quality test:', err)
        setError('Gagal menyimpan data uji air di mode demo')
        setSubmitting(false)
        return
      }
    }

    if (!supabase) return

    try {
      // Try with new column structure first
      let payload = {
        location_id: formData.locationId,
        test_date: formData.testDate,
        officer_id: profile.id,
        water_temperature_value: toDbUjiAirValue(formData.waterTemperatureValue),
        water_temperature_unit: formData.waterTemperatureUnit,
        air_temperature_value: toDbUjiAirValue(formData.airTemperatureValue),
        air_temperature_unit: formData.airTemperatureUnit,
        tds_value: toDbUjiAirValue(formData.tdsValue),
        turbidity_value: toDbUjiAirValue(formData.turbidityValue),
        color_value: toDbUjiAirValue(formData.colorValue),
        odor_value: toDbUjiAirValue(formData.odorValue),
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

      let result
      if (editing) {
        result = await supabase.from('water_quality_tests').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('water_quality_tests').insert(payload)
      }

       // If new columns don't exist, fall back to old structure
      const errorMsg = typeof result.error?.message === 'string' ? result.error.message : ''
      if (result.error && errorMsg.includes('column') && errorMsg.includes('does not exist')) {
        console.log('New columns not found, using fallback to old structure')
        
        // Fallback to old column structure for backward compatibility
        const fallbackPayload: any = {
          location_id: formData.locationId,
          test_date: formData.testDate,
          officer_id: profile.id,
          temperature_value: toDbUjiAirValue(formData.waterTemperatureValue),
          temperature_unit: formData.waterTemperatureUnit,
          tds_value: toDbUjiAirValue(formData.tdsValue),
          turbidity_value: toDbUjiAirValue(formData.turbidityValue),
          color_value: toDbUjiAirValue(formData.colorValue),
          odor_value: toDbUjiAirValue(formData.odorValue),
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

        if (editing) {
          result = await supabase.from('water_quality_tests').update(fallbackPayload).eq('id', editing.id)
        } else {
          result = await supabase.from('water_quality_tests').insert(fallbackPayload)
        }
      }

      if (result.error) throw result.error

      setFormOpen(false)
      void loadTests()
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err?.message || err?.details || 'Gagal menyimpan hasil uji')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(test: WaterQualityTest) {
    if (!window.confirm(`Hapus hasil uji tanggal ${test.testDate}?`)) return
    
    if (isDemoMode) {
      // In demo mode, remove from localStorage only
      try {
        const updatedTests = tests.filter(t => t.id !== test.id)
        localStorage.setItem('sigesit_demo_water_tests', JSON.stringify(updatedTests))
        setTests(updatedTests)
        return
      } catch (err) {
        console.error('Demo mode: Error removing water quality test:', err)
        window.alert('Gagal menghapus hasil uji di mode demo')
        return
      }
    }

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
               <input value={formData.airTemperatureValue} onChange={(e) => setValidatedUjiValue('airTemperatureValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" />
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
               <input value={formData.waterTemperatureValue} onChange={(e) => setValidatedUjiValue('waterTemperatureValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" />
              <select value={formData.waterTemperatureUnit} onChange={(e) => setFormData({ ...formData, waterTemperatureUnit: e.target.value as 'K' | 'C' | 'F' | 'R' })}>
                <option value="K">K</option>
                <option value="C">C</option>
                <option value="F">F</option>
                <option value="R">R</option>
              </select>
            </div>
          </label>
          <label><span className="entry-no">{nextEntryNo()}.</span> TDS (mg/L)<input value={formData.tdsValue} onChange={(e) => setValidatedUjiValue('tdsValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Kekeruhan (NTU)<input value={formData.turbidityValue} onChange={(e) => setValidatedUjiValue('turbidityValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Warna (TCU)<input value={formData.colorValue} onChange={(e) => setValidatedUjiValue('colorValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Bau<input value={formData.odorValue} onChange={(e) => setValidatedUjiValue('odorValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Kimia</h2>
        <div className="form-grid">
          <label><span className="entry-no">{nextEntryNo()}.</span> pH<input value={formData.phValue} onChange={(e) => setValidatedUjiValue('phValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Nitrat (mg/L)<input value={formData.nitrateValue} onChange={(e) => setValidatedUjiValue('nitrateValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Nitrit (mg/L)<input value={formData.nitriteValue} onChange={(e) => setValidatedUjiValue('nitriteValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Chromium (mg/L)<input value={formData.chromiumValue} onChange={(e) => setValidatedUjiValue('chromiumValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Besi (mg/L)<input value={formData.ironValue} onChange={(e) => setValidatedUjiValue('ironValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Mangan (mg/L)<input value={formData.manganeseValue} onChange={(e) => setValidatedUjiValue('manganeseValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Chlorine (mg/L)<input value={formData.chlorineValue} onChange={(e) => setValidatedUjiValue('chlorineValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Fluorida (mg/L)<input value={formData.fluorideValue} onChange={(e) => setValidatedUjiValue('fluorideValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Aluminium (mg/L)<input value={formData.aluminumValue} onChange={(e) => setValidatedUjiValue('aluminumValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Mikrobiologi</h2>
        <div className="form-grid">
          <label><span className="entry-no">{nextEntryNo()}.</span> E-coli (MPN/100ml)<input value={formData.eColiValue} onChange={(e) => setValidatedUjiValue('eColiValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
          <label><span className="entry-no">{nextEntryNo()}.</span> Coliform (MPN/100ml)<input value={formData.coliformValue} onChange={(e) => setValidatedUjiValue('coliformValue', e.target.value)} placeholder="Angka/simbol: < > = + - /" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Catatan / Notes</h2>
        <div className="form-grid">
          <label className="wide"><span className="entry-no">{nextEntryNo()}.</span> Catatan / Notes<textarea className="notes-textarea" style={{ width: '100%', minHeight: '120px', height: '120px' }} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={5} placeholder="Catatan / Notes (bebas)..." /></label>
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
        <div className="form-section filter-bar-section">
          <div className="filter-bar">
            <div className="filter-field">
              <label>Tanggal Awal</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Tanggal Akhir</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Filter Kelurahan</label>
              <select 
                value={filterKelurahanId} 
                onChange={(e) => setFilterKelurahanId(e.target.value)}
              >
                <option value="">Semua Kelurahan</option>
                {kelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="filter-search">
              <label>Pencarian</label>
              <div className="search-inline">
                <input
                  type="text"
                  value={freeSearch}
                  onChange={(e) => setFreeSearch(e.target.value)}
                  placeholder="Cari data..."
                />
                <button 
                  className="reset-btn" 
                  onClick={() => { setFilterKelurahanId(''); setFilterLocationId(''); setFreeSearch(''); setDateFrom(''); setDateTo('') }}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table">
          <thead>
            <tr>
              <th>Lokasi</th>
              <th>Tanggal Uji</th>
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
              <th>Catatan / Notes</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.map(test => {
              const locationInfo = getLocationInfo(test.locationId)
              const eColiPositive = isPositiveResult(test.eColiValue)
              const coliformPositive = isPositiveResult(test.coliformValue)
              return (
                <tr key={test.id}>
                  <td><strong>{locationInfo.name}</strong>{locationInfo.kelurahanName && <> <br /><small>{locationInfo.kelurahanName}</small></>}</td>
                   <td>{test.testDate}</td>
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
                   <td className={`
                     ${isEmptyUjiAirValue(test.eColiValue) ? 'uji-empty-cell' : ''}
                     ${eColiPositive ? 'positive-result' : ''}
                   `}>{formatWaterValue(test.eColiValue)}</td>
                   <td className={`
                     ${isEmptyUjiAirValue(test.coliformValue) ? 'uji-empty-cell' : ''}
                     ${coliformPositive ? 'positive-result' : ''}
                   `}>{formatWaterValue(test.coliformValue)}</td>
                  <td className={isEmptyUjiAirValue(test.notes) ? 'uji-empty-cell' : undefined}>{formatWaterValue(test.notes)}</td>
                   <td>
                     <div className="entry-actions">
                       <button className="edit-button" onClick={() => openForm(test)} type="button">Edit</button>
                       <button className="delete-button" onClick={() => remove(test)} type="button">Hapus</button>
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
  const [filterLocationId, setFilterLocationId] = useState('')
  const [freeSearch, setFreeSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Check demo mode
  const isDemoMode = useMemo(() => {
    try {
      return localStorage.getItem('sigesit_demo_mode') === 'true'
    } catch {
      return false
    }
  }, [])

  function toSearchableText(test: AirQualityTest): string {
    const location = locations.find(l => l.id === test.locationId)
    const locName = location?.name ?? ''
    const locAddress = location?.address ?? ''
    const kelurahanData = kelurahan.find(k => k.id === location?.kelurahanId)
    const kelName = kelurahanData?.name ?? ''
    const values = [
      test.testDate,
      test.temperature1, test.temperature2, test.temperature3, test.temperatureUnit,
      test.humidity1, test.humidity2, test.humidity3,
      test.noise1, test.noise2, test.noise3,
      test.lighting1, test.lighting2, test.lighting3,
      test.pm25_1, test.pm25_2, test.pm25_3,
      test.pm10_1, test.pm10_2, test.pm10_3,
      test.ventilationRate1, test.ventilationRate2, test.ventilationRate3,
      test.notes,
    ]
    return [locName, locAddress, kelName, ...values.map(v => String(v ?? ''))].join(' ').toLowerCase()
  }

  const debouncedFreeSearch = useDebounce(freeSearch, 150)

  // Filter tests berdasarkan filter yang dipilih
  const filteredTests = tests.filter(test => {
    if (dateFrom && test.testDate < dateFrom) return false
    if (dateTo && test.testDate > dateTo) return false
    if (filterLocationId) {
      return test.locationId === filterLocationId
    }
    if (filterKelurahanId) {
      const location = locations.find(loc => loc.id === test.locationId)
      if (location?.kelurahanId !== filterKelurahanId) return false
    }
    if (debouncedFreeSearch.trim()) {
      const q = debouncedFreeSearch.trim().toLowerCase()
      return toSearchableText(test).includes(q)
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
      'Lokasi',
      'Tanggal Uji',
      'Suhu 1/2/3',
      'Kelembapan 1/2/3',
      'Laju Ventilasi 1/2/3',
      'PM<2.5 1/2/3',
      'PM<10 1/2/3',
      'Kebisingan 1/2/3',
      'Pencahayaan 1/2/3',
    ]
    const rows = filteredTests.map((test) => {
      const info = getLocationInfo(test.locationId)
      const lokasiCell = info.kelurahanName ? `${info.name}\n${info.kelurahanName}` : info.name
      return [
        lokasiCell,
        test.testDate,
        `${test.temperature1 || 0}/${test.temperature2 || 0}/${test.temperature3 || 0}`,
        `${test.humidity1 || 0}/${test.humidity2 || 0}/${test.humidity3 || 0}`,
        `${test.ventilationRate1 || 0}/${test.ventilationRate2 || 0}/${test.ventilationRate3 || 0}`,
        `${test.pm25_1 || 0}/${test.pm25_2 || 0}/${test.pm25_3 || 0}`,
        `${test.pm10_1 || 0}/${test.pm10_2 || 0}/${test.pm10_3 || 0}`,
        `${test.noise1 || 0}/${test.noise2 || 0}/${test.noise3 || 0}`,
        `${test.lighting1 || 0}/${test.lighting2 || 0}/${test.lighting3 || 0}`,
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
    if (isDemoMode) {
      // In demo mode, load from localStorage
      setLoading(true)
      try {
        console.log('Demo mode: Loading air quality tests from localStorage')
        const savedTests = localStorage.getItem('sigesit_demo_air_tests')
        if (savedTests) {
          setTests(JSON.parse(savedTests))
          console.log('Demo mode: Air quality tests loaded from localStorage:', JSON.parse(savedTests).length)
        } else {
          setTests([])
          console.log('Demo mode: No air quality tests in localStorage')
        }
      } catch (err) {
        console.error('Demo mode: Error loading air quality tests:', err)
        setError('Gagal memuat data uji udara di mode demo')
        setTests([])
      } finally {
        setLoading(false)
      }
      return
    }

    if (!supabase || !profile) {
      console.error('Supabase or profile not available for air quality tests')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      console.log('Loading air quality tests for officer:', profile.id)
      const { data, error: loadError } = await supabase.from('air_quality_tests').select('*').eq('officer_id', profile.id).order('test_date', { ascending: false })
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

  // Only load tests after both profile and locations are available
  useEffect(() => {
    if (profile && locations.length > 0) {
      void loadTests()
    }
  }, [profile, locations, kelurahan])

  const loadAirTestsRef = useRef(loadTests)
  loadAirTestsRef.current = loadTests

  useEffect(() => {
    if (!supabase || !profile) return
    const db = supabase
    const channel = db
      .channel('air-tests-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'air_quality_tests' }, () => {
        loadAirTestsRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [profile, supabase])

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

  function resetFormData() {
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
    if (!profile) return
    
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

    if (isDemoMode) {
      // In demo mode, save to localStorage only
      try {
        const newTest: AirQualityTest = {
          id: editing?.id || `air-test-${Date.now()}`,
          locationId: formData.locationId,
          testDate: formData.testDate,
          officerId: profile.id,
          temperature1: Number(formData.temperature1) || undefined,
          temperature2: Number(formData.temperature2) || undefined,
          temperature3: Number(formData.temperature3) || undefined,
          temperatureUnit: formData.temperatureUnit,
          humidity1: Number(formData.humidity1) || undefined,
          humidity2: Number(formData.humidity2) || undefined,
          humidity3: Number(formData.humidity3) || undefined,
          noise1: Number(formData.noise1) || undefined,
          noise2: Number(formData.noise2) || undefined,
          noise3: Number(formData.noise3) || undefined,
          lighting1: Number(formData.lighting1) || undefined,
          lighting2: Number(formData.lighting2) || undefined,
          lighting3: Number(formData.lighting3) || undefined,
          pm25_1: Number(formData.pm25_1) || undefined,
          pm25_2: Number(formData.pm25_2) || undefined,
          pm25_3: Number(formData.pm25_3) || undefined,
          pm10_1: Number(formData.pm10_1) || undefined,
          pm10_2: Number(formData.pm10_2) || undefined,
          pm10_3: Number(formData.pm10_3) || undefined,
          ventilationRate1: Number(formData.ventilationRate1) || undefined,
          ventilationRate2: Number(formData.ventilationRate2) || undefined,
          ventilationRate3: Number(formData.ventilationRate3) || undefined,
          notes: formData.notes,
          createdAt: editing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        let updatedTests: AirQualityTest[]
        if (editing) {
          updatedTests = tests.map(test => test.id === editing.id ? newTest : test)
        } else {
          updatedTests = [newTest, ...tests]
        }
        
        // Sort by test date descending
        updatedTests.sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
        
        // Save to localStorage
        localStorage.setItem('sigesit_demo_air_tests', JSON.stringify(updatedTests))
        setTests(updatedTests)
        
        setFormOpen(false)
        setEditing(null)
        resetFormData()
        return
      } catch (err) {
        console.error('Demo mode: Error saving air quality test:', err)
        setError('Gagal menyimpan data uji udara di mode demo')
        setSubmitting(false)
        return
      }
    }

    if (!supabase) return

    try {
      const payload = {
        location_id: formData.locationId,
        test_date: formData.testDate,
        officer_id: profile.id,
        temperature_1: formData.temperature1 ? parseFloat(formData.temperature1) : null,
        temperature_2: formData.temperature2 ? parseFloat(formData.temperature2) : null,
        temperature_3: formData.temperature3 ? parseFloat(formData.temperature3) : null,
        temperature_unit: formData.temperatureUnit,
        humidity_1: formData.humidity1 ? parseFloat(formData.humidity1) : null,
        humidity_2: formData.humidity2 ? parseFloat(formData.humidity2) : null,
        humidity_3: formData.humidity3 ? parseFloat(formData.humidity3) : null,
        noise_1: formData.noise1 ? parseFloat(formData.noise1) : null,
        noise_2: formData.noise2 ? parseFloat(formData.noise2) : null,
        noise_3: formData.noise3 ? parseFloat(formData.noise3) : null,
        lighting_1: formData.lighting1 ? parseFloat(formData.lighting1) : null,
        lighting_2: formData.lighting2 ? parseFloat(formData.lighting2) : null,
        lighting_3: formData.lighting3 ? parseFloat(formData.lighting3) : null,
        pm25_1: formData.pm25_1 ? parseFloat(formData.pm25_1) : null,
        pm25_2: formData.pm25_2 ? parseFloat(formData.pm25_2) : null,
        pm25_3: formData.pm25_3 ? parseFloat(formData.pm25_3) : null,
        pm10_1: formData.pm10_1 ? parseFloat(formData.pm10_1) : null,
        pm10_2: formData.pm10_2 ? parseFloat(formData.pm10_2) : null,
        pm10_3: formData.pm10_3 ? parseFloat(formData.pm10_3) : null,
        ventilation_rate_1: formData.ventilationRate1 ? parseFloat(formData.ventilationRate1) : null,
        ventilation_rate_2: formData.ventilationRate2 ? parseFloat(formData.ventilationRate2) : null,
        ventilation_rate_3: formData.ventilationRate3 ? parseFloat(formData.ventilationRate3) : null,
        notes: formData.notes || null,
      }

      let result
      if (editing) {
        result = await supabase.from('air_quality_tests').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('air_quality_tests').insert(payload)
      }

      if (result.error) throw result.error

      setFormOpen(false)
      void loadTests()
    } catch (err: any) {
      console.error('Save error:', err)
      setError(err?.message || err?.details || 'Gagal menyimpan hasil uji')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(test: AirQualityTest) {
    if (!window.confirm(`Hapus hasil uji tanggal ${test.testDate}?`)) return
    
    if (isDemoMode) {
      // In demo mode, remove from localStorage only
      try {
        const updatedTests = tests.filter(t => t.id !== test.id)
        localStorage.setItem('sigesit_demo_air_tests', JSON.stringify(updatedTests))
        setTests(updatedTests)
        return
      } catch (err) {
        console.error('Demo mode: Error removing air quality test:', err)
        window.alert('Gagal menghapus hasil uji di mode demo')
        return
      }
    }

    if (!supabase) return

    const { error } = await supabase.from('air_quality_tests').delete().eq('id', test.id)
    if (error) {
      window.alert(`Gagal menghapus hasil uji: ${error.message}`)
      return
    }
    void loadTests()
  }

  if (loading) return <section className="master-page"><div className="empty-state"><span>🌬️</span><h2>Memuat data uji udara…</h2></div></section>

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
          <label>Suhu (°C)
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
          <label>Kelembapan (%)
            <div className="inline-fields">
              <input value={formData.humidity1} onChange={(e) => setFormData({ ...formData, humidity1: e.target.value })} placeholder="1" />
              <input value={formData.humidity2} onChange={(e) => setFormData({ ...formData, humidity2: e.target.value })} placeholder="2" />
              <input value={formData.humidity3} onChange={(e) => setFormData({ ...formData, humidity3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label>Laju Ventilasi (m³/h)
            <div className="inline-fields">
              <input value={formData.ventilationRate1} onChange={(e) => setFormData({ ...formData, ventilationRate1: e.target.value })} placeholder="1" />
              <input value={formData.ventilationRate2} onChange={(e) => setFormData({ ...formData, ventilationRate2: e.target.value })} placeholder="2" />
              <input value={formData.ventilationRate3} onChange={(e) => setFormData({ ...formData, ventilationRate3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label>Partikulat Debu &lt; 2.5 (µg/m³)
            <div className="inline-fields">
              <input value={formData.pm25_1} onChange={(e) => setFormData({ ...formData, pm25_1: e.target.value })} placeholder="1" />
              <input value={formData.pm25_2} onChange={(e) => setFormData({ ...formData, pm25_2: e.target.value })} placeholder="2" />
              <input value={formData.pm25_3} onChange={(e) => setFormData({ ...formData, pm25_3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label>Partikulat Debu &lt; 10 (µg/m³)
            <div className="inline-fields">
              <input value={formData.pm10_1} onChange={(e) => setFormData({ ...formData, pm10_1: e.target.value })} placeholder="1" />
              <input value={formData.pm10_2} onChange={(e) => setFormData({ ...formData, pm10_2: e.target.value })} placeholder="2" />
              <input value={formData.pm10_3} onChange={(e) => setFormData({ ...formData, pm10_3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label>Kebisingan (dB)
            <div className="inline-fields">
              <input value={formData.noise1} onChange={(e) => setFormData({ ...formData, noise1: e.target.value })} placeholder="1" />
              <input value={formData.noise2} onChange={(e) => setFormData({ ...formData, noise2: e.target.value })} placeholder="2" />
              <input value={formData.noise3} onChange={(e) => setFormData({ ...formData, noise3: e.target.value })} placeholder="3" />
            </div>
          </label>
          <label>Pencahayaan (lux)
            <div className="inline-fields">
              <input value={formData.lighting1} onChange={(e) => setFormData({ ...formData, lighting1: e.target.value })} placeholder="1" />
              <input value={formData.lighting2} onChange={(e) => setFormData({ ...formData, lighting2: e.target.value })} placeholder="2" />
              <input value={formData.lighting3} onChange={(e) => setFormData({ ...formData, lighting3: e.target.value })} placeholder="3" />
            </div>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Catatan</h2>
        <div className="form-grid">
          <label className="wide">Catatan<textarea className="notes-textarea" style={{ width: '100%', minHeight: '120px', height: '120px' }} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={5} placeholder="Catatan..." /></label>
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
        <div className="form-section filter-bar-section">
          <div className="filter-bar">
            <div className="filter-field">
              <label>Tanggal Awal</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Tanggal Akhir</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Filter Kelurahan</label>
              <select 
                value={filterKelurahanId} 
                onChange={(e) => setFilterKelurahanId(e.target.value)}
              >
                <option value="">Semua Kelurahan</option>
                {kelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="filter-search">
              <label>Pencarian</label>
              <div className="search-inline">
                <input
                  type="text"
                  value={freeSearch}
                  onChange={(e) => setFreeSearch(e.target.value)}
                  placeholder="Cari data..."
                />
                <button 
                  className="reset-btn" 
                  onClick={() => { setFilterKelurahanId(''); setFilterLocationId(''); setFreeSearch(''); setDateFrom(''); setDateTo('') }}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table">
          <thead>
            <tr>
              <th>Lokasi</th>
               <th>Tanggal Uji</th>
               <th>Suhu 1/2/3</th>
               <th>Kelembapan 1/2/3</th>
               <th>Laju Ventilasi 1/2/3</th>
               <th>PM&lt;2.5 1/2/3</th>
               <th>PM&lt;10 1/2/3</th>
               <th>Kebisingan 1/2/3</th>
               <th>Pencahayaan 1/2/3</th>
               <th style={{ minWidth: '220px', width: '220px' }}>Catatan</th>
               <th>Aksi</th>
             </tr>
          </thead>
          <tbody>
            {filteredTests.map(test => {
              const locationInfo = getLocationInfo(test.locationId)
              return (
              <tr key={test.id}>
                <td><strong>{locationInfo.name}</strong>{locationInfo.kelurahanName && <> <br /><small>{locationInfo.kelurahanName}</small></>}</td>
                <td>{test.testDate}</td>
                <td>{test.temperature1 || 0}/{test.temperature2 || 0}/{test.temperature3 || 0}</td>
                <td>{test.humidity1 || 0}/{test.humidity2 || 0}/{test.humidity3 || 0}</td>
                <td>{test.ventilationRate1 || 0}/{test.ventilationRate2 || 0}/{test.ventilationRate3 || 0}</td>
                <td>{test.pm25_1 || 0}/{test.pm25_2 || 0}/{test.pm25_3 || 0}</td>
                <td>{test.pm10_1 || 0}/{test.pm10_2 || 0}/{test.pm10_3 || 0}</td>
                <td>{test.noise1 || 0}/{test.noise2 || 0}/{test.noise3 || 0}</td>
                <td>{test.lighting1 || 0}/{test.lighting2 || 0}/{test.lighting3 || 0}</td>
                <td className={test.notes ? undefined : 'empty-cell'}>{test.notes || '-'}</td>
                 <td>
                   <div className="entry-actions">
                     <button className="edit-button" onClick={() => openForm(test)} type="button">Edit</button>
                     <button className="delete-button" onClick={() => remove(test)} type="button">Hapus</button>
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

function GroupTppPage({ profile }: { profile?: UserProfile | null }) {
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<GroupTpp | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [groupTppList, setGroupTppList] = useState<GroupTpp[]>([])
  const [freeSearch, setFreeSearch] = useState('')
  const debouncedFreeSearch = useDebounce(freeSearch, 150)

  async function loadGroupTpp() {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: loadError } = await supabase.from('group_tpp').select('*').order('name', { ascending: true })
      if (loadError) {
        setError(`Gagal memuat data Group/Jenis TPP: ${loadError.message}`)
        setLoading(false)
        return
      }
      if (!data || data.length === 0) {
        setGroupTppList([])
        setLoading(false)
        return
      }
      setGroupTppList((data as GroupTppRow[]).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })))
    } catch (err) {
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGroupTpp()
  }, [profile])

  const loadGroupTppRef = useRef(loadGroupTpp)
  loadGroupTppRef.current = loadGroupTpp

  useEffect(() => {
    if (!supabase || !profile) return
    const db = supabase
    const channel = db
      .channel('group-tpp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_tpp' }, () => {
        loadGroupTppRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [profile, supabase])

  function openForm(item?: GroupTpp) {
    setEditing(item ?? null)
    setError('')
    setFormOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setSubmitting(true)
    setError('')
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    if (!name) {
      setError('Nama Group/Jenis harus diisi')
      setSubmitting(false)
      return
    }
    try {
      const payload = {
        name,
        updated_at: new Date().toISOString(),
      }
      let result
      if (editing) {
        result = await supabase.from('group_tpp').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('group_tpp').insert({
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      if (result.error) throw result.error
      setFormOpen(false)
      void loadGroupTpp()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(item: GroupTpp) {
    if (!window.confirm(`Hapus Group/Jenis "${item.name}"?`)) return
    if (!supabase) return
    const { error } = await supabase.from('group_tpp').delete().eq('id', item.id)
    if (error) {
      window.alert(`Gagal menghapus data: ${error.message}`)
      return
    }
    void loadGroupTpp()
  }

  const filteredGroupTpp = groupTppList.filter(item => {
    if (!debouncedFreeSearch.trim()) return true
    const q = debouncedFreeSearch.trim().toLowerCase()
    return item.name.toLowerCase().includes(q)
  })

  function exportExcel() {
    if (filteredGroupTpp.length === 0) {
      window.alert('Tidak ada data Group/Jenis TPP untuk diexport.')
      return
    }
    const header = ['No', 'Nama Group/Jenis']
    const rows = filteredGroupTpp.map((item, index) => [index + 1, item.name])
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({
      fileName: `group_tpp_${today}.xlsx`,
      sheetName: 'Group Jenis TPP',
      header,
      rows,
    })
  }

  if (loading) return <section className="master-page"><div className="empty-state"><span>📋</span><h2>Memuat data Group/Jenis TPP…</h2></div></section>

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">DATA MASTER</p><h1>Group / Jenis TPP</h1><p>Kelola data group atau jenis TPP.</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button" disabled={groupTppList.length === 0}>Export Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Group/Jenis</button>
      </div>
    </div>

    {formOpen && <form className="entry-form compact-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DATA MASTER</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Group / Jenis TPP</h1>
          <p>Lengkapi nama group atau jenis TPP.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      <section className="form-section">
        <h2>Informasi Group/Jenis</h2>
        <div className="form-grid">
          <label className="wide">Nama Group/Jenis<input name="name" defaultValue={editing?.name} placeholder="Masukkan nama group/jenis" required /></label>
        </div>
      </section>
      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Batal</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    {!formOpen && groupTppList.length === 0 && <div className="empty-state"><span>📋</span><h2>Belum ada data Group/Jenis TPP</h2><p>Klik tombol di atas untuk menambahkan data.</p></div>}

    {!formOpen && groupTppList.length > 0 && (
      <>
        <div className="form-section filter-bar-section">
          <div className="filter-bar">
            <div className="filter-search">
              <label>Pencarian</label>
              <div className="search-inline">
                <input
                  type="text"
                  value={freeSearch}
                  onChange={(e) => setFreeSearch(e.target.value)}
                  placeholder="Cari nama group/jenis..."
                />
                <button 
                  className="reset-btn" 
                  onClick={() => setFreeSearch('')}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Menampilkan {filteredGroupTpp.length} dari {groupTppList.length} data
          </div>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Group/Jenis</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroupTpp.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>
                    <div className="entry-actions">
                      <button className="edit-button" onClick={() => openForm(item)} type="button">Edit</button>
                      <button className="delete-button" onClick={() => remove(item)} type="button">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </section>
}

function PanganPage({ profile, kelurahan, rw, rt, foodInspections, setFoodInspections }: {
  profile: UserProfile | null
  kelurahan: Region[]
  rw: Region[]
  rt: Region[]
  foodInspections: FoodInspectionResult[]
  setFoodInspections: (inspections: FoodInspectionResult[]) => void
}) {
  const inspections = foodInspections
  const setInspections = setFoodInspections
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FoodInspectionResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [groupTppList, setGroupTppList] = useState<GroupTpp[]>([])
  const [filterKelurahanId, setFilterKelurahanId] = useState('')
  const [freeSearch, setFreeSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const debouncedFreeSearch = useDebounce(freeSearch, 150)
  
  // Check demo mode
  const isDemoMode = useMemo(() => {
    try {
      return localStorage.getItem('sigesit_demo_mode') === 'true'
    } catch {
      return false
    }
  }, [])

  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    jenisTppId: '',
    address: '',
    kelurahanId: profile?.kelurahanId || '',
    rwId: profile?.rwId || '',
    rtId: profile?.rtId || '',
    penanggungJawab: profile?.fullName || '',
    phone: profile?.phone || '',
    hasilIkl: '' as 'MMS' | 'TMS' | '',
  })

  const [samples, setSamples] = useState<FoodInspectionSample[]>([
    { nama_makanan: '', boraks: '', formalin: '', rodaminB: '', metanilYellow: '', eColi: '', remarks: '' },
  ])

  const emptySample = (): FoodInspectionSample => ({
    nama_makanan: '',
    boraks: '',
    formalin: '',
    rodaminB: '',
    metanilYellow: '',
    eColi: '',
    remarks: '',
  })

  const addSample = () => setSamples((prev) => [...prev, emptySample()])

  const removeSample = (index: number) =>
    setSamples((prev) => prev.filter((_, i) => i !== index))

  const updateSample = (index: number, patch: Partial<FoodInspectionSample>) =>
    setSamples((prev) => prev.map((s, i) => {
      if (i !== index) return s
      const next: FoodInspectionSample = {
        nama_makanan: String((patch as any).nama_makanan ?? s?.nama_makanan ?? ''),
        boraks: ((patch as any).boraks ?? s?.boraks ?? '') as 'Positif' | 'Negatif' | '',
        formalin: ((patch as any).formalin ?? s?.formalin ?? '') as 'Positif' | 'Negatif' | '',
        rodaminB: ((patch as any).rodaminB ?? s?.rodaminB ?? '') as 'Positif' | 'Negatif' | '',
        metanilYellow: ((patch as any).metanilYellow ?? s?.metanilYellow ?? '') as 'Positif' | 'Negatif' | '',
        eColi: ((patch as any).eColi ?? s?.eColi ?? '') as 'Positif' | 'Negatif' | '',
        remarks: String((patch as any).remarks ?? s?.remarks ?? ''),
      }
      return next
    }))

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const entryHari = formData.entryDate ? dayNames[new Date(formData.entryDate).getDay()] : ''

  const nextEntryNumber = inspections.length > 0
    ? Math.max(...inspections.map(i => i.entryNumber)) + 1
    : 1

  const rwOptions = rw.filter((item) => item.kelurahanId === formData.kelurahanId)
  const rwInKelurahan = rw.filter((item) => item.kelurahanId === formData.kelurahanId)
  const rwIdSet = new Set(rwInKelurahan.map((item) => item.id))
  const rtOptions = formData.rwId
    ? rt.filter((item) => item.rwId === formData.rwId)
    : rt.filter((item) => item.rwId && rwIdSet.has(item.rwId))

  async function loadGroupTpp() {
    if (!supabase) return
    const { data, error: loadError } = await supabase.from('group_tpp').select('*').order('name', { ascending: true })
    if (loadError) {
      console.error('Error loading group_tpp:', loadError.message)
      return
    }
    if (data) {
      setGroupTppList((data as GroupTppRow[]).map(row => ({
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })))
    }
  }

  async function loadInspections() {
    if (isDemoMode) {
      // In demo mode, load from localStorage
      setLoading(true)
      try {
        console.log('Demo mode: Loading food inspections from localStorage')
        const savedInspections = localStorage.getItem('sigesit_demo_food_inspections')
        if (savedInspections) {
          setInspections(JSON.parse(savedInspections))
          console.log('Demo mode: Food inspections loaded from localStorage:', JSON.parse(savedInspections).length)
        } else {
          setInspections([])
          console.log('Demo mode: No food inspections in localStorage')
        }
      } catch (err) {
        console.error('Demo mode: Error loading food inspections:', err)
        setError('Gagal memuat data hasil pemeriksaan di mode demo')
        setInspections([])
      } finally {
        setLoading(false)
      }
      return
    }

    if (!supabase || !profile) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: loadError } = await supabase.from('food_inspection_results').select('*').eq('officer_id', profile.id).order('entry_date', { ascending: false })
      if (loadError) throw loadError
      setInspections((data as FoodInspectionRow[]).map(mapFoodInspectionRow))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data hasil pemeriksaan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGroupTpp()
  }, [profile])

  const loadGroupTppRef = useRef(loadGroupTpp)
  loadGroupTppRef.current = loadGroupTpp

  useEffect(() => {
    if (!supabase || !profile) return
    const db = supabase
    const channel = db
      .channel('inspections-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_inspection_results' }, () => {
        loadInspectionsRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [profile, supabase])

  useEffect(() => {
    if (profile) void loadInspections()
  }, [profile])

  const loadInspectionsRef = useRef(loadInspections)
  loadInspectionsRef.current = loadInspections

  useEffect(() => {
    if (!supabase || !profile) return
    const db = supabase
    const channel = db
      .channel('group-tpp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_tpp' }, () => {
        loadGroupTppRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [profile, supabase])

  function toSearchableText(inspection: FoodInspectionResult): string {
    const kelName = kelurahan.find(k => k.id === inspection.kelurahanId)?.name ?? ''
    const rwName = inspection.rwId ? rw.find(r => r.id === inspection.rwId)?.name ?? '' : ''
    const rtName = inspection.rtId ? rt.find(r => r.id === inspection.rtId)?.name ?? '' : ''
    const tppName = groupTppList.find(g => g.id === inspection.jenisTppId)?.name ?? ''
    const sampleText = (inspection.samples ?? [])
      .map((s) => [
        s.nama_makanan,
        s.boraks,
        s.formalin,
        s.rodaminB,
        s.metanilYellow,
        s.eColi,
        s.remarks,
      ].join(' '))
      .join(' ')
    return [
      inspection.entryNumber.toString(),
      inspection.entryDate,
      tppName,
      inspection.address ?? '',
      kelName,
      rwName,
      rtName,
      inspection.penanggungJawab ?? '',
      inspection.phone ?? '',
      inspection.hasilIkl,
      sampleText,
    ].join(' ').toLowerCase()
  }

  const filteredInspections = inspections.filter((inspection) => {
    if (dateFrom && inspection.entryDate < dateFrom) return false
    if (dateTo && inspection.entryDate > dateTo) return false
    if (filterKelurahanId && inspection.kelurahanId !== filterKelurahanId) return false
    if (debouncedFreeSearch.trim()) {
      const q = debouncedFreeSearch.trim().toLowerCase()
      return toSearchableText(inspection).includes(q)
    }
    return true
  })

  function cleanPhone(value?: string | null): string {
    if (!value) return ''
    const digits = value.replace(/\D/g, '')
    if (digits === '00000000' || digits === '0'.repeat(digits.length)) return ''
    return digits
  }

  function openForm(item?: FoodInspectionResult) {
    setEditing(item ?? null)
    setError('')
    if (item) {
      setFormData({
        entryDate: item.entryDate,
        jenisTppId: item.jenisTppId || '',
        address: item.address || '',
        kelurahanId: item.kelurahanId || '',
        rwId: item.rwId || '',
        rtId: item.rtId || '',
        penanggungJawab: item.penanggungJawab || '',
        phone: cleanPhone(item.phone),
        hasilIkl: item.hasilIkl || '',
      })
      setSamples(item.samples && item.samples.length > 0 ? item.samples : [emptySample()])
    } else {
      setFormData({
        entryDate: new Date().toISOString().split('T')[0],
        jenisTppId: '',
        address: '',
        kelurahanId: profile?.kelurahanId || '',
        rwId: profile?.rwId || '',
        rtId: profile?.rtId || '',
        penanggungJawab: '',
        phone: cleanPhone(profile?.phone),
        hasilIkl: '',
      })
      setSamples([emptySample()])
    }
    setFormOpen(true)
  }

  useEffect(() => {
    if (!formOpen) return
    if (editing) return
    if (formData.kelurahanId) return
    const defaultKelurahanId = kelurahan[0]?.id ?? ''
    if (!defaultKelurahanId) return
    const defaultRwId = rw.find((item) => item.kelurahanId === defaultKelurahanId)?.id ?? ''
    const defaultRtId = rt.find((item) => item.rwId === defaultRwId)?.id ?? ''
    setFormData((prev) => ({ ...prev, kelurahanId: defaultKelurahanId, rwId: defaultRwId, rtId: defaultRtId }))
  }, [formOpen, editing, formData.kelurahanId, kelurahan, rw, rt])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setSubmitting(true)
    setError('')
    
    if (isDemoMode) {
      // In demo mode, save to localStorage only
      try {
        const entryDayText = formData.entryDate ? dayNames[new Date(formData.entryDate).getDay()] : ''
        const newInspection: FoodInspectionResult = {
          id: editing?.id || `food-inspection-${Date.now()}`,
          entryNumber: editing?.entryNumber || inspections.length + 1,
          entryDate: formData.entryDate,
          entryDay: entryDayText || undefined,
          jenisTppId: formData.jenisTppId || undefined,
          address: formData.address.trim() || undefined,
          kelurahanId: formData.kelurahanId || undefined,
          rwId: formData.rwId || undefined,
          rtId: formData.rtId || undefined,
          penanggungJawab: formData.penanggungJawab.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          hasilIkl: formData.hasilIkl || '',
          samples: samples.map((s) => ({
            nama_makanan: String(s?.nama_makanan ?? '').trim(),
            boraks: s?.boraks || '',
            formalin: s?.formalin || '',
            rodaminB: s?.rodaminB || '',
            metanilYellow: s?.metanilYellow || '',
            eColi: s?.eColi || '',
            remarks: String(s?.remarks ?? '').trim(),
          })),
          officerId: profile.id,
          createdAt: editing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        let updatedInspections: FoodInspectionResult[]
        if (editing) {
          updatedInspections = inspections.map(insp => insp.id === editing.id ? newInspection : insp)
        } else {
          updatedInspections = [newInspection, ...inspections]
        }
        
        // Sort by entry date descending
        updatedInspections.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
        
        // Save to localStorage
        localStorage.setItem('sigesit_demo_food_inspections', JSON.stringify(updatedInspections))
        setInspections(updatedInspections)
        
        setFormOpen(false)
        setSamples([emptySample()])
        return
      } catch (err) {
        console.error('Demo mode: Error saving food inspection:', err)
        setError('Gagal menyimpan data di mode demo')
        setSubmitting(false)
        return
      }
    }

    if (!supabase) return

    try {
      const entryDayText = formData.entryDate ? dayNames[new Date(formData.entryDate).getDay()] : ''
      const payload = {
        entry_date: formData.entryDate,
        entry_day: entryDayText || null,
        jenis_tpp_id: formData.jenisTppId || null,
        address: formData.address.trim() || null,
        kelurahan_id: formData.kelurahanId || null,
        rw_id: formData.rwId || null,
        rt_id: formData.rtId || null,
        penanggung_jawab: formData.penanggungJawab.trim() || null,
        phone: formData.phone.trim() || null,
        hasil_ikl: formData.hasilIkl || null,
        samples: samples.map((s) => ({
          nama_makanan: String(s?.nama_makanan ?? '').trim(),
          boraks: s?.boraks || null,
          formalin: s?.formalin || null,
          rodamin_b: s?.rodaminB || null,
          metanil_yellow: s?.metanilYellow || null,
          e_coli: s?.eColi || null,
          remarks: String(s?.remarks ?? '').trim() || null,
        })),
        e_coli_result: samples[0]?.eColi || null,
        officer_id: profile.id,
        updated_at: new Date().toISOString(),
      }
      let result
      if (editing) {
        result = await supabase.from('food_inspection_results').update(payload).eq('id', editing.id)
      } else {
        result = await supabase.from('food_inspection_results').insert(payload)
      }
      if (result.error) throw result.error
      setFormOpen(false)
      setSamples([emptySample()])
      void loadInspections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(item: FoodInspectionResult) {
    if (!window.confirm(`Hapus hasil pemeriksaan No. ${item.entryNumber}?`)) return
    
    if (isDemoMode) {
      // In demo mode, remove from localStorage only
      try {
        const updatedInspections = inspections.filter(insp => insp.id !== item.id)
        localStorage.setItem('sigesit_demo_food_inspections', JSON.stringify(updatedInspections))
        setInspections(updatedInspections)
        return
      } catch (err) {
        console.error('Demo mode: Error removing food inspection:', err)
        window.alert('Gagal menghapus data di mode demo')
        return
      }
    }

    if (!supabase) return
    const { error } = await supabase.from('food_inspection_results').delete().eq('id', item.id)
    if (error) {
      window.alert(`Gagal menghapus data: ${error.message}`)
      return
    }
    void loadInspections()
  }

  function getKelurahanName(id?: string): string {
    if (!id) return '-'
    return kelurahan.find(k => k.id === id)?.name || '-'
  }

  function getGroupName(id?: string): string {
    if (!id) return '-'
    return groupTppList.find(g => g.id === id)?.name || '-'
  }

  function exportExcel() {
    if (filteredInspections.length === 0) {
      window.alert('Tidak ada data hasil pemeriksaan untuk diexport.')
      return
    }
    const header = [
      'No', 'No. Sampel', 'Hari', 'Tanggal', 'Jenis TPP', 'alamat', 'Kelurahan', 'RW', 'RT',
      'Penanggung Jawab', 'No. HP', 'Hasil IKL', 'Jenis Makanan/Sample',
      'Boraks', 'Formalin', 'Rodamin B', 'Metanil Yellow', 'E-Coli', 'Keterangan',
    ]
    const rows: ExcelCell[][] = []
    filteredInspections.forEach((item, index) => {
      const samples = item.samples && item.samples.length > 0 ? item.samples : [{ nama_makanan: '', boraks: '', formalin: '', rodaminB: '', metanilYellow: '', eColi: '', remarks: '' }]
      samples.forEach((sample, sIndex) => {
        rows.push([
          index + 1,
          sIndex + 1,
          item.entryDay || new Date(item.entryDate).toLocaleDateString('id-ID', { weekday: 'long' }),
          item.entryDate,
          getGroupName(item.jenisTppId),
          item.address || '-',
          getKelurahanName(item.kelurahanId),
          item.rwId ? `RW ${rw.find(r => r.id === item.rwId)?.name || '-'}` : '-',
          item.rtId ? `RT ${rt.find(r => r.id === item.rtId)?.name || '-'}` : '-',
          item.penanggungJawab || '-',
          item.phone || '-',
          item.hasilIkl || '-',
          sample.nama_makanan || '-',
          sample.boraks || '-',
          sample.formalin || '-',
          sample.rodaminB || '-',
          sample.metanilYellow || '-',
          sample.eColi || '-',
          sample.remarks || '-',
        ])
      })
    })
    const today = new Date().toISOString().slice(0, 10)
    exportToExcel({
      fileName: `hasil_pangan_${today}.xlsx`,
      sheetName: 'Hasil Pemeriksaan Pangan',
      header,
      rows,
    })
  }

  if (loading) return <section className="master-page"><div className="empty-state"><span>🍱</span><h2>Memuat data hasil pemeriksaan…</h2></div></section>

  const iklBadge = (value: 'MMS' | 'TMS' | ''): string => {
    if (value === 'MMS') return 'ikl-badge ikl-mms'
    if (value === 'TMS') return 'ikl-badge ikl-tms'
    return ''
  }

  const resultOptions = [
    { value: '', label: '- Pilih -' },
    { value: 'Positif', label: 'Positif' },
    { value: 'Negatif', label: 'Negatif' },
  ]

  const iklOptions = [
    { value: '', label: '- Pilih -' },
    { value: 'MMS', label: 'MMS' },
    { value: 'TMS', label: 'TMS' },
  ]

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">PEMERIKSAAN</p><h1>Hasil Pemeriksaan Pangan/Makanan</h1><p>Kelola hasil pemeriksaan pangan/makanan (Boraks, Formalin, Rodamin B, Metanil Yellow, E-Coli).</p></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button className="secondary" onClick={exportExcel} type="button" disabled={inspections.length === 0}>Export Excel</button>
        <button className="primary" onClick={() => openForm()} type="button">+ Tambah Hasil</button>
      </div>
    </div>

    {formOpen && <form className="entry-form compact-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMERIKSAAN</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Hasil Pemeriksaan Pangan/Makanan</h1>
          <p>Lengkapi data hasil pemeriksaan pangan/makanan.</p>
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <section className="form-section">
        <h2>Informasi Pemeriksaan</h2>
        <div className="form-grid">
          <label>No.
            <input type="text" value={editing ? editing.entryNumber : nextEntryNumber} readOnly style={{ background: 'var(--color-surface-alt)', cursor: 'default' }} placeholder="Auto-generate" />
          </label>
          <label>Hari & Tanggal
            <input type="date" value={formData.entryDate} onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })} required />
            <small style={{ display: 'block', marginTop: '6px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Hari: {entryHari || '-'}</small>
          </label>
          <label>Jenis TPP
            <select value={formData.jenisTppId} onChange={(e) => setFormData({ ...formData, jenisTppId: e.target.value })} required>
              <option value="">Pilih Jenis TPP</option>
              {groupTppList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label>Hasil IKL
            <select value={formData.hasilIkl} onChange={(e) => setFormData({ ...formData, hasilIkl: e.target.value as 'MMS' | 'TMS' | '' })} required>
              {iklOptions.map(opt => <option key={opt.value || '__empty__'} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Informasi Lokasi</h2>
        <div className="form-grid">
          <label className="wide">Alamat
            <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={2} placeholder="Masukkan alamat pemeriksaan" />
          </label>
          <label>Kelurahan
            <select value={formData.kelurahanId} onChange={(e) => { const val = e.target.value; setFormData((prev) => ({ ...prev, kelurahanId: val, rwId: '', rtId: '' })) }} required>
              <option value="">Pilih kelurahan</option>
              {kelurahan.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>RT (Opsional)
            <select value={formData.rtId} onChange={(e) => setFormData({ ...formData, rtId: e.target.value })}>
              <option value="">- Tidak memilih RT -</option>
              {formData.kelurahanId && rtOptions.map(item => <option key={item.id} value={item.id}>RT {item.name}</option>)}
            </select>
          </label>
          <label>RW (Opsional)
            <select value={formData.rwId} onChange={(e) => setFormData({ ...formData, rwId: e.target.value, rtId: '' })}>
              <option value="">- Tidak memilih RW -</option>
              {formData.kelurahanId && rwOptions.map(item => <option key={item.id} value={item.id}>RW {item.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Penanggung Jawab & Kontak</h2>
        <div className="form-grid">
          <label>Penanggung Jawab
            <input value={formData.penanggungJawab} onChange={(e) => setFormData({ ...formData, penanggungJawab: e.target.value })} placeholder="Nama penanggung jawab" />
          </label>
          <label>No. HP
            <input type="tel" inputMode="numeric" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} placeholder="08xx-xxxx-xxxx" />
          </label>
        </div>
      </section>

      <section className="form-section samples-section">
        <div className="samples-section-header">
          <h2>Hasil Pemeriksaan (Multi-Entry)</h2>
          <button className="secondary" onClick={addSample} type="button">+ Tambah Sampel</button>
        </div>
        <div className="samples-list">
          {samples.length === 0 ? (
            <div className="sample-empty">Belum ada sampel. Klik "+ Tambah Sampel" untuk menambahkan.</div>
          ) : (
            samples.map((sample, index) => (
              <div className="sample-card" key={index}>
                <div className="sample-card-header">
                  <span className="sample-badge">Sampel {index + 1}</span>
                  <div className="sample-card-actions">
                    {samples.length > 1 && (
                      <button className="delete-button" onClick={() => removeSample(index)} type="button" style={{ padding: '4px 10px', fontSize: '12px' }}>Hapus</button>
                    )}
                  </div>
                </div>
                <div className="sample-card-grid">
                  <label>Jenis Makanan/Sample
                    <input value={sample.nama_makanan} onChange={(e) => updateSample(index, { nama_makanan: e.target.value })} placeholder="Contoh: Makanan kering, minuman, etc." />
                  </label>
                  <label>Boraks
                    <select value={sample.boraks} onChange={(e) => updateSample(index, { boraks: e.target.value as 'Positif' | 'Negatif' | '' })}>
                      {resultOptions.map(opt => <option key={opt.value || `b-${index}`} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label>Formalin
                    <select value={sample.formalin} onChange={(e) => updateSample(index, { formalin: e.target.value as 'Positif' | 'Negatif' | '' })}>
                      {resultOptions.map(opt => <option key={opt.value || `f-${index}`} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label>Rodamin B
                    <select value={sample.rodaminB} onChange={(e) => updateSample(index, { rodaminB: e.target.value as 'Positif' | 'Negatif' | '' })}>
                      {resultOptions.map(opt => <option key={opt.value || `r-${index}`} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label>Metanil Yellow
                    <select value={sample.metanilYellow} onChange={(e) => updateSample(index, { metanilYellow: e.target.value as 'Positif' | 'Negatif' | '' })}>
                      {resultOptions.map(opt => <option key={opt.value || `m-${index}`} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label>E-Coli
                    <select value={sample.eColi} onChange={(e) => updateSample(index, { eColi: e.target.value as 'Positif' | 'Negatif' | '' })}>
                      {resultOptions.map(opt => <option key={opt.value || `e-${index}`} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </label>
                  <label className="wide">Keterangan
                    <textarea value={sample.remarks} onChange={(e) => updateSample(index, { remarks: e.target.value })} rows={2} placeholder="Keterangan tambahan (opsional)" />
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="form-actions" style={{ marginTop: '16px' }}>
        <button className="secondary" onClick={() => setFormOpen(false)} type="button">Kembali</button>
        <button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>}

    {!formOpen && inspections.length === 0 && <div className="empty-state"><span>🍱</span><h2>Belum ada data hasil pemeriksaan</h2><p>Klik tombol di atas untuk menambahkan hasil pemeriksaan pangan/makanan baru.</p></div>}

    {!formOpen && inspections.length > 0 && (
      <>
        <div className="form-section filter-bar-section">
          <div className="filter-bar">
            <div className="filter-field">
              <label>Tanggal Awal</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Tanggal Akhir</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="filter-field">
              <label>Filter Kelurahan</label>
              <select value={filterKelurahanId} onChange={(e) => setFilterKelurahanId(e.target.value)}>
                <option value="">Semua Kelurahan</option>
                {kelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </div>
            <div className="filter-search">
              <label>Pencarian</label>
              <div className="search-inline">
                <input type="text" value={freeSearch} onChange={(e) => setFreeSearch(e.target.value)} placeholder="Cari data..." />
                <button className="reset-btn" onClick={() => { setFilterKelurahanId(''); setFreeSearch(''); setDateFrom(''); setDateTo('') }} type="button">Reset</button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Menampilkan {filteredInspections.length} dari {inspections.length} data
          </div>
        </div>
<div className="data-table-container">
          <table className="data-table sample-rekap-table">
            <thead>
              <tr>
                <th className="sample-no">No</th>
                <th>Hari & Tanggal</th>
                <th>Jenis TPP</th>
                <th>alamat</th>
                <th>Wilayah</th>
                <th>Penanggung Jawab</th>
                <th>No. HP</th>
                <th>Hasil IKL</th>
                <th>Jenis Makanan/Sample</th>
                <th>Boraks</th>
                <th>Formalin</th>
                <th>Rodamin B</th>
                <th>Metanil Yellow</th>
                <th>E-Coli</th>
                <th>Keterangan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.map((item, index) => {
                const samples = item.samples && item.samples.length > 0 ? item.samples : [{ nama_makanan: '', boraks: '', formalin: '', rodaminB: '', metanilYellow: '', eColi: '', remarks: '' }]
                return [
                  <tr className="sample-parent-row" key={`${item.id}-parent`}>
                    <td className="sample-no">{index + 1}</td>
                    <td>
                      <strong>{item.entryDay || '-'}</strong>
                      <br />
                      <small>{item.entryDate}</small>
                    </td>
                    <td>{getGroupName(item.jenisTppId)}</td>
                    <td>{item.address || '-'}</td>
                    <td>
                      {getKelurahanName(item.kelurahanId)}
                      {item.rwId && ` · RW ${rw.find(r => r.id === item.rwId)?.name || '-'}`}
                      {item.rtId && ` · RT ${rt.find(r => r.id === item.rtId)?.name || '-'}`}
                    </td>
                    <td>{item.penanggungJawab || '-'}</td>
                    <td>{item.phone || '-'}</td>
                    <td><span className={iklBadge(item.hasilIkl)}>{item.hasilIkl || '-'}</span></td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>
                      <div className="entry-actions">
                        <button className="edit-button" onClick={() => openForm(item)} type="button">Edit</button>
                        <button className="delete-button" onClick={() => remove(item)} type="button">Hapus</button>
                      </div>
                    </td>
                  </tr>,
                  ...samples.map((sample, sIndex) => (
                    <tr key={`${item.id}-sample-${sIndex}`}>
                      <td className="sample-no">{sIndex + 1}</td>
                      <td colSpan={7}></td>
                      <td>{String(sample?.nama_makanan ?? '') || '-'}</td>
                      <td className="sample-result-cell"><span className={`sample-result-pill ${sample?.boraks ? sample.boraks.toLowerCase() : 'empty'}`}>{sample?.boraks || '-'}</span></td>
                      <td className="sample-result-cell"><span className={`sample-result-pill ${sample?.formalin ? sample.formalin.toLowerCase() : 'empty'}`}>{sample?.formalin || '-'}</span></td>
                      <td className="sample-result-cell"><span className={`sample-result-pill ${sample?.rodaminB ? sample.rodaminB.toLowerCase() : 'empty'}`}>{sample?.rodaminB || '-'}</span></td>
                      <td className="sample-result-cell"><span className={`sample-result-pill ${sample?.metanilYellow ? sample.metanilYellow.toLowerCase() : 'empty'}`}>{sample?.metanilYellow || '-'}</span></td>
                      <td className="sample-result-cell"><span className={`sample-result-pill ${sample?.eColi ? sample.eColi.toLowerCase() : 'empty'}`}>{sample?.eColi || '-'}</span></td>
                      <td>{String(sample?.remarks ?? '') || '-'}</td>
                      <td></td>
                    </tr>
                  )),
]
              })}
            </tbody>
          </table>
        </div>
      </>
    )}
  </section>
}

function LoginPage({ onLoginSuccess }: { onLoginSuccess?: () => Promise<void> }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '').trim()
    
    console.log('Login attempt:', { email, passwordLength: password.length })
    
    // Check for demo mode credentials (case-insensitive for email)
    if (email.toLowerCase() === 'demo@sigesit.local' && password === 'demo_pass123') {
      console.log('Demo mode credentials detected')
      setSubmitting(true)
      // Store demo mode in localStorage
      try {
        localStorage.setItem('sigesit_demo_mode', 'true')
        localStorage.setItem('sigesit_demo_user', 'demo@sigesit.local')
        console.log('Demo mode stored in localStorage')
      } catch (e) {
        console.error('Failed to store demo mode:', e)
        setError('Gagal mengaktifkan mode demo')
        setSubmitting(false)
        return
      }
      setSubmitting(false)
      // Trigger page reload to activate demo mode
      console.log('Reloading page to activate demo mode')
      window.location.reload()
      return
    }
    
    console.log('Proceeding with normal Supabase login')
    // Normal login flow
    if (!supabase) { setError('Supabase belum dikonfigurasi.'); return }
    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    console.log('Supabase login result:', { email, passwordLength: password.length, error: signInError?.message })
    setSubmitting(false)
    if (signInError) {
      const raw = signInError.message || ''
      let message = 'User atau kata sandi salah.'
      if (raw.includes('Email not confirmed') || raw.includes('email_not_confirmed')) {
        message = 'Email belum diverifikasi. Silakan cek inbox atau hubungi admin.'
      } else if (raw) {
        message = raw
      }
      setError(message)
    } else {
      await onLoginSuccess?.()
    }
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
      <div className="brand-mark large">S</div>
      <h1>SIGESIT</h1>
      <p>Masuk untuk mengelola pendataan SADAKELING PKM PADASUKA - KOTA CIMAHI.</p>
      {error && <div className="auth-error">{error}</div>}
      <label>User<input autoComplete="username" name="email" required type="text" /></label>
      <label>Kata sandi<div style={{ position: 'relative' }}>
        <input autoComplete="current-password" name="password" required type={showPassword ? 'text' : 'password'} style={{ width: '100%', paddingRight: '40px' }} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
          {showPassword ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
        </button>
      </div></label>
      <button className="primary" disabled={submitting} type="submit">{submitting ? 'Memproses…' : 'Masuk'}</button>
      <div style={{ marginTop: '20px', textAlign: 'center', fontWeight: 'bold', color: 'black' }}>
        Copyright : 2026 - SingosariPROJECT
      </div>
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
  const [moduleAccess, setModuleAccess] = useState<ModuleAccess>(getDefaultModuleAccess('kader'))
  const [selectedRole, setSelectedRole] = useState<UserRole>('kader')
  const [generatedPasswords, setGeneratedPasswords] = useState<Record<string, string>>({})
  const [showFormPassword, setShowFormPassword] = useState(false)
  const [showListPasswords, setShowListPasswords] = useState(false)
  const [formPassword, setFormPassword] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sigesit_show_list_passwords')
      if (saved !== null) setShowListPasswords(saved === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sigesit_show_form_password')
      if (saved !== null) setShowFormPassword(saved === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('sigesit_show_list_passwords', String(showListPasswords))
    } catch {}
  }, [showListPasswords])

  useEffect(() => {
    try {
      localStorage.setItem('sigesit_show_form_password', String(showFormPassword))
    } catch {}
  }, [showFormPassword])

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

  useEffect(() => { void loadUsers() }, [currentUserId])

  const loadUsersRef = useRef(loadUsers)
  loadUsersRef.current = loadUsers

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    const channel = db
      .channel('users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        loadUsersRef.current()
      })
      .subscribe()
    return () => {
      db.removeChannel(channel)
    }
  }, [supabase])

  function generateUsername(nik: string): string {
    const last5Digits = nik.slice(-5)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let uniqueLetters = ''
    for (let i = 0; i < 3; i++) {
      uniqueLetters += letters.charAt(Math.floor(Math.random() * letters.length))
    }
    return last5Digits + uniqueLetters
  }

  function generatePassword(): string {
    const length = 12
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return password
  }

  function openForm(user?: UserProfile) {
    setEditing(user ?? null)
    setError('')
    setSelectedKelurahanId(user?.kelurahanId ?? '')
    setSelectedRwId(user?.rwId ?? '')
    const role = user?.role ?? 'kader'
    setSelectedRole(role)
    setModuleAccess(user?.moduleAccess || getDefaultModuleAccess(role))
    setFormOpen(true)
    setShowFormPassword(false)
    setFormPassword(user ? '' : generatePassword())
  }

  function handleRoleChange(role: UserRole) {
    setSelectedRole(role)
    setModuleAccess(getDefaultModuleAccess(role))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const data = new FormData(event.currentTarget)
    const nik = String(data.get('nik') ?? '').trim()
    const emailInput = String(data.get('email') ?? '').trim()
    
     // NIK uniqueness validation
     if (!editing && nik) {
       const { data: existingUser } = await supabase.from('profiles').select('id').eq('nik', nik).single()
       if (existingUser) {
         setError('duplicate key value violates unique constraint "profiles_nik_key"')
         return
       }
     }
     
     let updatedModuleAccess = moduleAccess
     if (selectedRole === 'admin') {
       updatedModuleAccess = {
         entry: data.get('moduleAccess_entry') === 'on',
         wilayah: data.get('moduleAccess_wilayah') === 'on',
         pengguna: false,
         lokasi: data.get('moduleAccess_lokasi') === 'on',
         uji_air: data.get('moduleAccess_uji_air') === 'on',
         uji_udara: data.get('moduleAccess_uji_udara') === 'on',
         pangan: data.get('moduleAccess_pangan') === 'on',
         group_tpp: data.get('moduleAccess_group_tpp') === 'on',
       }
     } else {
       updatedModuleAccess = getDefaultModuleAccess(selectedRole)
     }
    
    let username = editing?.username
    let password = formPassword
    
    if (password) {
      const passwordValidationError = validatePasswordStrength(password)
      if (passwordValidationError) {
        setError(passwordValidationError)
        return
      }
    }
    
    // Auto-generate username and password for new users if not provided
    if (!editing) {
      username = generateUsername(nik)
      password = password || generatePassword()
    }
    
    const payload = {
      action: editing ? 'update' : 'create',
      id: editing?.id,
      email: emailInput || `${username}@sigesit.local`,
      password: password || undefined,
      fullName: String(data.get('fullName') ?? '').trim(),
      username: username,
      nik: nik,
      phone: String(data.get('phone') ?? '').trim(),
       role: selectedRole,
      kelurahanId: String(data.get('kelurahanId') ?? '') || undefined,
      rwId: String(data.get('rwId') ?? '') || undefined,
      rtId: String(data.get('rtId') ?? '') || undefined,
      isActive: data.get('isActive') === 'on',
      moduleAccess: updatedModuleAccess,
    }
    
    if (!editing && !payload.password) { setError('Kata sandi wajib diisi untuk akun baru.'); return }
    setSubmitting(true)
    setError('')
    console.log('Sending payload to Edge Function:', payload)
    const { data: result, error: invokeError } = await supabase.functions.invoke('admin-users', { body: payload })
    console.log('Edge Function response:', { result, invokeError: JSON.stringify(invokeError) })
    setSubmitting(false)
    const typedResult = result as { success?: boolean; error?: string; data?: { id?: string; email?: string; username?: string; fullName?: string; generatedPassword?: string } } | null
    const resultError = typedResult?.error
    const functionError = invokeError ? await getFunctionErrorMessage(invokeError) : null
    if (invokeError || resultError) { setError(resultError ?? functionError ?? 'Gagal menyimpan pengguna.'); return }
    
    if (!editing && typedResult?.success && typedResult.data?.generatedPassword) {
      const createdData = typedResult.data
      setGeneratedPasswords(prev => ({ ...prev, [createdData.id!]: createdData.generatedPassword! }))
      alert(`User berhasil dibuat!\n\nUsername: ${createdData.username}\nPassword: ${createdData.generatedPassword}\n\nSimpan credentials ini untuk user.`)
    } else if (editing && password) {
      setGeneratedPasswords(prev => ({ ...prev, [editing.id]: password }))
      alert(`Password berhasil diubah untuk ${editing.fullName}.\n\nPassword baru: ${password}`)
    }
    
    setFormOpen(false)
    setEditing(null)
    void loadUsers()
  }

  async function toggleActive(user: UserProfile) {
    if (!supabase) return
    const { error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'update', id: user.id, isActive: !user.isActive } })
    if (invokeError) { window.alert(await getFunctionErrorMessage(invokeError) ?? 'Gagal memperbarui status pengguna.'); return }
    void loadUsers()
  }

  async function removeUser(user: UserProfile) {
    if (!supabase) return
    if (user.id === currentUserId) { window.alert('Tidak dapat menghapus akun sendiri.'); return }
    if (!window.confirm(`Hapus pengguna ${user.fullName}?`)) return
    const { error: invokeError } = await supabase.functions.invoke('admin-users', { body: { action: 'delete', id: user.id } })
    if (invokeError) { window.alert(await getFunctionErrorMessage(invokeError) ?? 'Gagal menghapus pengguna.'); return }
    void loadUsers()
  }

  async function regeneratePassword(user: UserProfile) {
    if (!supabase) return
    if (!window.confirm(`Generate password baru untuk ${user.fullName}? Password lama akan diganti.`)) return
    
    const newPassword = generatePassword()
    const { error: invokeError } = await supabase.functions.invoke('admin-users', { 
      body: { action: 'update', id: user.id, password: newPassword } 
    })
    
    if (invokeError) { 
      window.alert(await getFunctionErrorMessage(invokeError) ?? 'Gagal generate password.'); 
      return 
    }
    
    // Store and show new password
    setGeneratedPasswords(prev => ({ ...prev, [user.id]: newPassword }))
    alert(`Password baru berhasil digenerate!\n\nUsername: ${user.username}\nPassword: ${newPassword}\n\nSimpan credentials ini untuk user.`)
  }

  const rwOptions = rw.filter((item) => item.kelurahanId === selectedKelurahanId)
  const rtOptions = rt.filter((item) => item.rwId === selectedRwId)

  // Hitung statistik pengguna
  const activeUsers = users.filter(u => u.isActive).length
  const superAdmins = users.filter(u => u.role === 'super_admin').length
  const kaders = users.filter(u => u.role === 'kader' && u.isActive).length

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">DATA MASTER</p><h1>Pengguna Kader & Relawan</h1><p>Kelola akun kader, relawan, dan admin yang dapat mengakses SIGESIT.</p></div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah pengguna</button>
    </div>

    {/* Statistik Pengguna */}
    <div className="stat-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      <article className="stat-card">
        <span className="stat-icon blue">👥</span>
        <div>
          <p>Total Pengguna</p>
          <strong>{users.length}</strong>
          <small>Semua akun terdaftar</small>
        </div>
      </article>
      <article className="stat-card">
        <span className="stat-icon green">✅</span>
        <div>
          <p>Pengguna Aktif</p>
          <strong>{activeUsers}</strong>
          <small>Akun dapat login</small>
        </div>
      </article>
      <article className="stat-card">
        <span className="stat-icon coral">👑</span>
        <div>
          <p>Super Admin</p>
          <strong>{superAdmins}</strong>
          <small>Admin sistem</small>
        </div>
      </article>
      <article className="stat-card">
        <span className="stat-icon teal">📋</span>
        <div>
          <p>Total Kader</p>
          <strong>{kaders}</strong>
          <small>Petugas lapangan</small>
        </div>
      </article>
    </div>

    {formOpen && <form className="region-form" onSubmit={submit}>
      <strong>{editing ? 'Edit' : 'Tambah'} pengguna kader/relawan</strong>
      {error && <div className="auth-error">{error}</div>}
      <div className="region-form-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Data Dasar */}
        <div style={{ gridColumn: '1/-1', marginBottom: '8px' }}><h4 style={{ margin: '16px 0 8px 0', color: '#374151' }}>Data Dasar Pengguna</h4></div>
        <label>Nama lengkap<input defaultValue={editing?.fullName} name="fullName" required style={{ width: '100%' }} /></label>
        <label>NIK (16 digit)<input defaultValue={editing?.nik} maxLength={16} minLength={16} name="nik" required type="text" style={{ width: '100%' }} /></label>
        <label>No. HP<input defaultValue={editing?.phone} name="phone" required type="tel" style={{ width: '100%' }} /></label>
        <label>User (opsional)<input defaultValue={editing?.email || ''} name="email" type="email" style={{ width: '100%' }} /></label>
         <label>Kata sandi{editing ? '' : ' (opsional)'}
           <div style={{ display: 'flex', gap: '8px' }}>
             <input value={formPassword} onChange={(event) => setFormPassword(event.target.value)} name="password" type={showFormPassword ? 'text' : 'password'} style={{ flex: 1 }} />
             <button type="button" onClick={() => setShowFormPassword(!showFormPassword)} style={{ padding: '8px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
               {showFormPassword ? '🙈' : '👁️'}
             </button>
           </div>
         </label>
        <small style={{ gridColumn: '1/-1', color: '#6b7280', fontSize: '12px' }}>Password harus mengandung huruf besar, huruf kecil, angka, dan simbol.</small>
        
        {/* Wilayah Tugas */}
        <div style={{ gridColumn: '1/-1', marginBottom: '8px', marginTop: '16px' }}><h4 style={{ margin: '16px 0 8px 0', color: '#374151' }}>Wilayah Tugas</h4></div>
        <label>Kelurahan<select name="kelurahanId" onChange={(event) => { setSelectedKelurahanId(event.target.value); setSelectedRwId('') }} value={selectedKelurahanId} required style={{ width: '100%' }}><option value="">Pilih kelurahan</option>{kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>RW<select disabled={!selectedKelurahanId} name="rwId" onChange={(event) => setSelectedRwId(event.target.value)} value={selectedRwId} required style={{ width: '100%' }}><option value="">Pilih RW</option>{rwOptions.map((item) => <option key={item.id} value={item.id}>RW {item.name}</option>)}</select></label>
        <label>RT<select defaultValue={editing?.rtId ?? ''} disabled={!selectedRwId} name="rtId" required style={{ width: '100%' }}><option value="">Pilih RT</option>{rtOptions.map((item) => <option key={item.id} value={item.id}>RT {item.name}</option>)}</select></label>
        <label>Status Akun<select defaultValue={editing?.isActive === false ? 'off' : 'on'} name="isActive" style={{ width: '100%' }}><option value="on">🟢 Aktif</option><option value="off">🔴 Nonaktif</option></select></label>
        
        {/* Role Selection (Super Admin only) */}
        <label>Peran / Role
          <select value={selectedRole} onChange={(e) => handleRoleChange(e.target.value as UserRole)} style={{ width: '100%' }}>
            <option value="kader">📋 Kader</option>
            <option value="admin">🛡️ Admin</option>
            <option value="super_admin">👑 Super Admin</option>
          </select>
        </label>
        <small style={{ gridColumn: '1/-1', color: '#6b7280', fontSize: '12px' }}>{ROLE_DESCRIPTIONS[selectedRole]}</small>
        
        {/* Hak Akses Modul */}
        <div style={{ gridColumn: '1/-1', marginBottom: '8px', marginTop: '16px' }}><h4 style={{ margin: '16px 0 8px 0', color: '#374151' }}>Hak Akses Modul {selectedRole === 'admin' && '(Pilih modul yang diizinkan)'}{selectedRole === 'super_admin' && '(Full akses otomatis)'}{selectedRole === 'kader' && '(Hanya Data Entry)'}</h4></div>
        <div className="module-access" style={{ gridColumn: '1/-1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
          {MODULES.map((mod) => {
            const isDisabled = selectedRole !== 'admin' || mod.key === 'pengguna'
            const isChecked = moduleAccess[mod.key]
            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              if (selectedRole === 'admin' && mod.key !== 'pengguna') {
                setModuleAccess({...moduleAccess, [mod.key]: e.target.checked})
              }
            }
            return (
              <label key={mod.key} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: isChecked ? '#dbeafe' : 'white', borderRadius: '6px', border: `1px solid ${isChecked ? '#93c5fd' : '#e5e7eb'}` }}>
                <input
                  checked={isChecked}
                  onChange={handleChange}
                  disabled={isDisabled}
                  name={`moduleAccess_${mod.key}`}
                  type="checkbox"
                  style={{ accentColor: '#3b82f6', cursor: isDisabled ? 'default' : 'pointer' }}
                /> {mod.icon} Akses modul {mod.label}
              </label>
            )
          })}
        </div>
        {!editing && <div className="generated-info" style={{ gridColumn: '1/-1', background: '#dbeafe', padding: '16px', borderRadius: '8px', border: '1px solid #93c5fd' }}>
          <p style={{ margin: '4px 0' }}><strong>ℹ️ Username:</strong> Akan digenerate otomatis (5 digit terakhir NIK + 3 huruf unik)</p>
          <p style={{ margin: '4px 0' }}><strong>🔐 Password:</strong> Akan digenerate otomatis (12 karakter) dan akan ditampilkan setelah user dibuat</p>
        </div>}
      </div>
      <div className="form-actions" style={{ marginTop: '24px', justifyContent: 'flex-end', gap: '12px' }}><button className="secondary" onClick={() => setFormOpen(false)} type="button">↩️ Kembali</button><button className="primary" disabled={submitting} type="submit">{submitting ? '⏳ Menyimpan…' : '✓ Simpan'}</button></div>
    </form>}

    {/* Daftar Pengguna - Table View (support >100 user) */}
    <div className="user-table-container" style={{ marginTop: '16px' }}>
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setShowListPasswords(!showListPasswords)} style={{ padding: '8px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>
          {showListPasswords ? '🙈 Sembunyikan Password' : '👁️ Tampilkan Password'}
        </button>
      </div>
      {error && <div className="error-message" style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b' }}>{error}</div>}
      {loading ? <div className="empty-state"><span>♙</span><h2>Memuat data pengguna…</h2></div> : users.length === 0 ? <div className="empty-state"><span>♙</span><h2>Belum ada pengguna</h2><p>Tambahkan akun kader atau admin untuk mulai mengelola akses.</p></div> : (
        <div className="data-table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>User</th>
                <th>No. HP</th>
                <th>NIK</th>
                <th>Role</th>
                <th>Password</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                return (<>
                  <tr key={user.id}>
                    <td><strong>{user.fullName}</strong></td>
                    <td><code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{user.username}</code></td>
                    <td>{user.email || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.nik || '-'}</td>
                      <td>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: user.role === 'super_admin' ? '#fef3c7' : user.role === 'admin' ? '#dcfce7' : '#e0e7ff', color: user.role === 'super_admin' ? '#92400e' : user.role === 'admin' ? '#166534' : '#3730a3' }}>
                        {user.role === 'super_admin' ? '👑 Super Admin' : user.role === 'admin' ? '🛡️ Admin' : '📋 Kader'}
                      </span>
                    </td>
                    <td>
                      {showListPasswords ? (
                        generatedPasswords[user.id] ? (
                          <code style={{ fontSize: '12px', background: '#fef9c3', padding: '4px 8px', borderRadius: '4px', color: '#92400e' }}>{generatedPasswords[user.id]}</code>
                        ) : (
                          <button type="button" onClick={() => regeneratePassword(user)} style={{ padding: '4px 8px', fontSize: '12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: '4px', cursor: 'pointer' }}>🔐 Generate</button>
                        )
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>•••••••••</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', background: user.isActive ? '#dcfce7' : '#fef2f2', color: user.isActive ? '#166534' : '#991b1b' }}>
                        {user.isActive ? '🟢 Aktif' : '🔴 Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        <button className="edit-button" onClick={() => openForm(user)} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>✏️ Edit</button>
                        <button className="secondary" onClick={() => regeneratePassword(user)} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>🔐 Password</button>
                        {user.role === 'kader' && <button className="secondary" onClick={() => regeneratePassword(user)} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>🔑 Ubah Password</button>}
                        <button className="secondary" onClick={() => toggleActive(user)} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>{user.isActive ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}</button>
                        <button className="delete-button" onClick={() => removeUser(user)} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>🗑️ Hapus</button>
                      </div>
                    </td>
                  </tr>
                  {showListPasswords && generatedPasswords[user.id] && (
                    <tr key={`${user.id}-pw`}>
                      <td colSpan={9} style={{ background: '#fef9c3', fontSize: '12px', padding: '6px 12px', borderBottom: '1px solid #fef08a' }}>
                        <strong>🔑 Password Baru:</strong> {generatedPasswords[user.id]}
                      </td>
                    </tr>
                  )}
                </>)
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </section>
}

function SettingsPage({ onSave }: { onSave: (s: AppSettings) => void }) {
  const [local, setLocal] = useState<AppSettings>(loadSettings)
  const [saved, setSaved] = useState(false)
  const { t, setLanguage } = useTranslation()

  useEffect(() => {
    setLocal(loadSettings())
  }, [])

  function handleSave() {
    saveSettings(local)
    onSave(local)
    setLanguage(local.language)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const themeOptions = [
    { value: 'default', label: 'Default' },
    { value: 'elegantBlue', label: 'Elegant Blue' },
    { value: 'metallicGray', label: 'Metallic Gray' },
    { value: 'softGold', label: 'Soft Gold' },
    { value: 'glossyBlack', label: 'Glossy Black' },
    { value: 'cleanWhite', label: 'Clean White' },
  ]

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'DM Sans', label: 'DM Sans' },
  ]

  return <section className="master-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">{t.menu.account}</p>
        <h1>{t.settings.title}</h1>
        <p>{t.settings.description}</p>
      </div>
    </div>

    <div className="form-section" style={{ maxWidth: '720px' }}>
      {saved && <div className="saved-note" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>{t.profile.success}</div>}
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label>
          {t.settings.theme}
          <select value={local.theme} onChange={(e) => setLocal({ ...local, theme: e.target.value as ThemeId })}>
            {themeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>

        <label>
          {t.settings.fontFamily}
          <select value={local.fontFamily} onChange={(e) => setLocal({ ...local, fontFamily: e.target.value })}>
            {fontOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </label>

        <label>
          {t.settings.language}
          <select value={local.language} onChange={(e) => setLocal({ ...local, language: e.target.value as Language })}>
            <option value="id">Bahasa Indonesia</option>
            <option value="en">English</option>
            <option value="su">Bahasa Sunda</option>
          </select>
        </label>
      </div>
      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button className="primary" onClick={handleSave} type="button">{t.settings.save}</button>
      </div>
    </div>
  </section>
}

function UnauthorizedPage() {
  return <section className="master-page">
    <div className="page-heading">
      <div>
        <p className="eyebrow">Akses Ditolak</p>
        <h1>Tidak Memiliki Hak Akses</h1>
        <p>Anda tidak memiliki hak untuk mengakses halaman ini.</p>
      </div>
    </div>
    <div className="empty-state">
      <span>🔒</span>
      <h2>Unauthorized</h2>
      <p>Hubungi administrator untuk mendapatkan akses.</p>
      <button className="primary" onClick={() => window.history.back()} type="button">Kembali</button>
    </div>
  </section>
}

export default App