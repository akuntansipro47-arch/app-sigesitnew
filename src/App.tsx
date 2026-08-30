import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { supabase, supabaseConfigured } from './lib/supabase'

type View = 'beranda' | 'entry' | 'wilayah' | 'pengguna' | 'profile' | 'lokasi' | 'uji_air' | 'uji_udara'
type RegionLevel = 'kelurahan' | 'rw' | 'rt'
type Region = { id: string; name: string; code?: string; kelurahanId?: string; rwId?: string }
type UserRole = 'super_admin' | 'kader'
type ModuleAccess = { entry: boolean; wilayah: boolean; pengguna: boolean; lokasi: boolean; uji_air: boolean; uji_udara: boolean }
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
}
type ProfileRow = { id: string; full_name: string; username: string; nik: string; phone: string; email: string | null; role: UserRole; kelurahan_id: string | null; rw_id: string | null; rt_id: string | null; is_active: boolean; module_access: Partial<ModuleAccess> | null }

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
  temperatureValue?: number
  temperatureUnit: 'K' | 'C' | 'F' | 'R'
  tdsValue?: number
  turbidityValue?: number
  colorValue?: string
  odorValue?: string
  phValue?: number
  nitriteValue?: number
  nitrateValue?: number
  chromiumValue?: number
  ironValue?: number
  manganeseValue?: number
  chlorineValue?: number
  fluorideValue?: number
  aluminumValue?: number
  eColiValue?: number
  coliformValue?: number
  notes?: string
}

type WaterQualityTestRow = { id: string; location_id: string; test_date: string; officer_id: string; temperature_value: number | null; temperature_unit: string; tds_value: number | null; turbidity_value: number | null; color_value: string | null; odor_value: string | null; ph_value: number | null; nitrite_value: number | null; nitrate_value: number | null; chromium_value: number | null; iron_value: number | null; manganese_value: number | null; chlorine_value: number | null; fluoride_value: number | null; aluminum_value: number | null; e_coli_value: number | null; coliform_value: number | null; notes: string | null }

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
  jamban: [
    { code: 'bab_di_jamban', text: 'Buang Air Besar di Jamban' },
    { code: 'jamban_milik_sendiri', text: 'Jamban Milik Sendiri' },
    { code: 'kloset_leher_angsa', text: 'Kloset Leher Angsa' },
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
    moduleAccess: { entry: true, wilayah: true, pengguna: false, lokasi: true, uji_air: true, uji_udara: true, ...row.module_access },
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
    temperatureValue: row.temperature_value ?? undefined,
    temperatureUnit: row.temperature_unit as 'K' | 'C' | 'F' | 'R',
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

const entries = [
  { id: 'ENT-20260827-001', kepala: 'Bpk. Ade Suhendar', location: 'RW 05 / RT 03', status: 'Tersinkron', time: '08.42' },
  { id: 'ENT-20260827-002', kepala: 'Ibu Neni Kurniasih', location: 'RW 05 / RT 04', status: 'Tersinkron', time: '09.15' },
  { id: 'ENT-20260827-003', kepala: 'Bpk. Dedi Mulyadi', location: 'RW 05 / RT 02', status: 'Menunggu sinkronisasi', time: '10.08' },
]

function App() {
  const [view, setView] = useState<View>('beranda')
  const [online, setOnline] = useState(true)
  const [kelurahan, setKelurahan] = useState(initialKelurahan)
  const [rw, setRw] = useState(initialRw)
  const [rt, setRt] = useState(initialRt)
  const [regionsLoaded, setRegionsLoaded] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [pkmInfo, setPkmInfo] = useState<PKMInfo | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)

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
      if (!supabase || !session) { setProfile(null); return }
      // Retry profile loading with delay if initial load fails
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase.from('pkm_profiles').select('*').eq('id', session.user.id).single()
        console.log('Load profile result:', { data, error: error?.message, userId: session.user.id, attempt: i + 1 })
        if (!error && data) {
          setProfile(mapProfileRow(data as ProfileRow))
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
        moduleAccess: { entry: true, wilayah: true, pengguna: false, lokasi: true, uji_air: true, uji_udara: true }
      })
    }
    void loadProfile()
  }, [session])

  useEffect(() => {
    async function loadRegions() {
      if (supabaseConfigured && supabase) {
        const [kelurahanResult, rwResult, rtResult] = await Promise.all([
          supabase.from('kelurahan').select('id, name, code').order('name'),
          supabase.from('rw').select('id, number, kelurahan_id'),
          supabase.from('rt').select('id, number, rw_id'),
        ])
        if (!kelurahanResult.error && !rwResult.error && !rtResult.error) {
          const kelurahanData = kelurahanResult.data.map((item) => ({ id: item.id, name: item.name, code: item.code }))
          setKelurahan(kelurahanData)
          
          // Sort RW by kelurahan name, then by number
          const rwData = rwResult.data.map((item) => ({ id: item.id, name: item.number, kelurahanId: item.kelurahan_id }))
          rwData.sort((a, b) => {
            const kelurahanA = kelurahanData.find(k => k.id === a.kelurahanId)?.name || ''
            const kelurahanB = kelurahanData.find(k => k.id === b.kelurahanId)?.name || ''
            if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
            return a.name.localeCompare(b.name)
          })
          setRw(rwData)
          
          // Sort RT by kelurahan name, then RW number, then RT number
          const rtData = rtResult.data.map((item) => ({ id: item.id, name: item.number, rwId: item.rw_id }))
          rtData.sort((a, b) => {
            const rwA = rwData.find(r => r.id === a.rwId)
            const rwB = rwData.find(r => r.id === b.rwId)
            const kelurahanA = kelurahanData.find(k => k.id === rwA?.kelurahanId)?.name || ''
            const kelurahanB = kelurahanData.find(k => k.id === rwB?.kelurahanId)?.name || ''
            if (kelurahanA !== kelurahanB) return kelurahanA.localeCompare(kelurahanB)
            if (rwA?.name !== rwB?.name) return (rwA?.name || '').localeCompare(rwB?.name || '')
            return a.name.localeCompare(b.name)
          })
          setRt(rtData)
          
          setRegionsLoaded(true)
          return
        }
      }
      const stored = localStorage.getItem('sigesit-regions')
      if (stored) {
        const data = JSON.parse(stored) as { kelurahan: Region[]; rw: Region[]; rt: Region[] }
        setKelurahan(data.kelurahan)
        setRw(data.rw)
        setRt(data.rt)
      }
      setRegionsLoaded(true)
    }
    void loadRegions()
  }, [])

  useEffect(() => {
    if (regionsLoaded && !supabaseConfigured) localStorage.setItem('sigesit-regions', JSON.stringify({ kelurahan, rw, rt }))
  }, [kelurahan, rw, rt, regionsLoaded])

  useEffect(() => {
    async function loadLocations() {
      if (supabaseConfigured && supabase) {
        const { data, error } = await supabase.from('locations').select('*').order('name')
        if (!error && data) {
          setLocations((data as LocationRow[]).map(mapLocationRow))
        }
      }
    }
    void loadLocations()
  }, [])

  useEffect(() => {
    async function loadPKMInfo() {
      if (supabaseConfigured && supabase) {
        const { data, error } = await supabase.from('pkm_info').select('*').single()
        if (!error && data) {
          setPkmInfo(mapPKMInfoRow(data as PKMInfoRow))
        }
      }
    }
    void loadPKMInfo()
  }, [])

  if (supabaseConfigured && !authReady) return <main className="auth-shell"><p className="auth-loading">Memuat sesi…</p></main>
  if (supabaseConfigured && !session) return <LoginPage />

  const displayName = profile?.fullName ?? 'Syifa Zahra'
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const canAccessPengguna = true
  const pkmName = pkmInfo?.namaPkm || 'Sandas PKM Padasuka'
  const pkmLogo = pkmInfo?.logoUrl

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand">
        {pkmLogo ? (
          <img src={pkmLogo} alt="Logo PKM" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'contain' }} />
        ) : (
          <div className="brand-mark">S</div>
        )}
        <div><strong>SIGESIT</strong><span>{pkmName}</span></div>
      </div>
      <div className="topbar-actions"><button className={`connection ${online ? 'online' : 'offline'}`} onClick={() => setOnline(!online)} type="button"><i />{online ? 'Terhubung' : 'Offline'}</button><button className="avatar" type="button" aria-label={`Profil ${displayName}`}>{initials || 'SZ'}</button>{session && <button className="logout" onClick={() => { void supabase?.auth.signOut() }} type="button">Keluar</button>}</div>
    </header>
    <section className="workspace">
      <aside className="sidebar">
        {pkmLogo && (
          <div style={{ padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
            <img src={pkmLogo} alt="Logo PKM" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        )}
        <p className="side-label">MENU UTAMA</p><nav><button className={view === 'beranda' ? 'active' : ''} onClick={() => setView('beranda')} type="button"><span>⌂</span> Beranda</button><button className={view === 'entry' ? 'active' : ''} onClick={() => setView('entry')} type="button"><span>+</span> Entry Data</button></nav>
        <p className="side-label">PEMERIKSAAN</p><nav><button className={view === 'uji_air' ? 'active' : ''} onClick={() => setView('uji_air')} type="button"><span>💧</span> Uji Air</button><button className={view === 'uji_udara' ? 'active' : ''} onClick={() => setView('uji_udara')} type="button"><span>🌬️</span> Uji Udara</button></nav>
        <p className="side-label">DATA MASTER</p><nav><button className={view === 'wilayah' ? 'active' : ''} onClick={() => setView('wilayah')} type="button"><span>⌘</span> Wilayah</button><button className={view === 'lokasi' ? 'active' : ''} onClick={() => setView('lokasi')} type="button"><span>📍</span> Lokasi</button>{canAccessPengguna && <button className={view === 'pengguna' ? 'active' : ''} onClick={() => setView('pengguna')} type="button"><span>♙</span> Pengguna</button>}</nav>
        <p className="side-label">AKUN</p><nav><button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')} type="button"><span>👤</span> Profil PKM</button></nav>
        <div className="sidebar-footer"><span className="sync-dot" /><div><strong>1 data belum sinkron</strong><small>Data akan terkirim saat online</small></div></div>
      </aside>
      <section className="content">{view === 'entry' ? <EntryPage profile={profile} kelurahan={kelurahan} rw={rw} rt={rt} /> : view === 'wilayah' ? <WilayahPage kelurahan={kelurahan} rw={rw} rt={rt} setKelurahan={setKelurahan} setRw={setRw} setRt={setRt} /> : view === 'pengguna' && canAccessPengguna ? <PenggunaPage kelurahan={kelurahan} rw={rw} rt={rt} currentUserId={session?.user.id} /> : view === 'profile' ? <ProfilePage /> : view === 'lokasi' ? <LokasiPage kelurahan={kelurahan} rw={rw} rt={rt} /> : view === 'uji_air' ? <UjiAirPage profile={profile} locations={locations} /> : view === 'uji_udara' ? <UjiUdaraPage profile={profile} locations={locations} /> : <Dashboard view={view} setView={setView} pkmInfo={pkmInfo} />}</section>
    </section>
  </main>
}

function WilayahPage({ kelurahan, rw, rt, setKelurahan, setRw, setRt }: { kelurahan: Region[]; rw: Region[]; rt: Region[]; setKelurahan: (items: Region[]) => void; setRw: (items: Region[]) => void; setRt: (items: Region[]) => void }) {
  const [level, setLevel] = useState<RegionLevel>('kelurahan')
  const [editing, setEditing] = useState<Region | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedKelurahanId, setSelectedKelurahanId] = useState('')
  const [parentId, setParentId] = useState('')
  const items = level === 'kelurahan' ? kelurahan : level === 'rw' ? rw : rt
  const parents = level === 'rw' ? kelurahan : rw.filter((item) => item.kelurahanId === selectedKelurahanId)

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
    if (level === 'kelurahan') setKelurahan(editing ? kelurahan.map((current) => current.id === item.id ? item : current) : [...kelurahan, item])
    if (level === 'rw') setRw(editing ? rw.map((current) => current.id === item.id ? item : current) : [...rw, item])
    if (level === 'rt') setRt(editing ? rt.map((current) => current.id === item.id ? item : current) : [...rt, item])
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
  return <section className="master-page"><div className="page-heading"><div><p className="eyebrow">DATA MASTER</p><h1>Data Wilayah</h1><p>Kelola Kelurahan, RW, dan RT dengan hubungan wilayah yang terjaga.</p></div><button className="primary" onClick={() => openForm()} type="button">+ Tambah {level}</button></div><div className="region-tabs">{(['kelurahan', 'rw', 'rt'] as RegionLevel[]).map((tab) => <button className={level === tab ? 'active' : ''} key={tab} onClick={() => { setLevel(tab); setFormOpen(false) }} type="button">{tab.toUpperCase()} <span>{tab === 'kelurahan' ? kelurahan.length : tab === 'rw' ? rw.length : rt.length}</span></button>)}</div>{formOpen && <form className="region-form" onSubmit={save}><strong>{editing ? 'Edit' : 'Tambah'} {level}</strong><div className="region-form-fields"><label>Nama {level}<input name="name" defaultValue={editing?.name} placeholder={level === 'kelurahan' ? 'Nama kelurahan' : 'Contoh: 05'} required /></label>{level === 'kelurahan' && <label>Kode wilayah<input name="code" defaultValue={editing?.code} placeholder="Kode kelurahan" required /></label>}{level === 'rw' && <label>Kelurahan<select value={parentId} onChange={(event) => setParentId(event.target.value)} required><option value="">Pilih kelurahan</option>{kelurahan.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label>}{level === 'rt' && <><label>Kelurahan<select value={selectedKelurahanId} onChange={(event) => { setSelectedKelurahanId(event.target.value); setParentId('') }} required><option value="">Pilih kelurahan</option>{kelurahan.map((parent) => <option key={parent.id} value={parent.id}>{parent.name}</option>)}</select></label><label>RW<select value={parentId} onChange={(event) => setParentId(event.target.value)} disabled={!selectedKelurahanId} required><option value="">{selectedKelurahanId ? 'Pilih RW' : 'Pilih kelurahan terlebih dahulu'}</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>RW {parent.name}</option>)}</select></label></>}</div><div className="form-actions"><button className="secondary" onClick={() => setFormOpen(false)} type="button">Batal</button><button className="primary" type="submit">Simpan</button></div></form>}<div className="region-list">{items.length === 0 ? <div className="empty-state"><span>⌘</span><h2>Belum ada data</h2><p>Tambahkan {level} untuk mulai membangun wilayah kerja.</p></div> : items.map((item) => <article className="region-row" key={item.id}><div><strong>{level === 'rw' ? `RW ${item.name}` : level === 'rt' ? `RT ${item.name}` : item.name}</strong><small>{level === 'kelurahan' ? `Kode: ${item.code}` : level === 'rt' ? rtLocation(item) : `Kelurahan: ${parentName(item)}`}</small></div><div className="row-actions"><button className="edit-button" onClick={() => openForm(item)} type="button">Edit</button><button className="delete-button" onClick={() => remove(item)} type="button">Hapus</button></div></article>)}</div></section>
}

function Dashboard({ view, setView, pkmInfo }: { view: View; setView: (view: View) => void; pkmInfo: PKMInfo | null }) {
  const title = view === 'wilayah' ? 'Data Wilayah' : view === 'pengguna' ? 'Pengguna Kader & Relawan' : 'Selamat pagi, Syifa.'
  const pkmName = pkmInfo?.namaPkm || 'PKM Padasuka'
  if (view !== 'beranda') return <section className="master-page"><div className="page-heading"><div><p className="eyebrow">DATA MASTER</p><h1>{title}</h1><p>Kelola data yang digunakan oleh seluruh petugas lapangan.</p></div><button className="primary" type="button">+ Tambah data</button></div><div className="empty-state"><span>{view === 'wilayah' ? '⌘' : '♙'}</span><h2>Siap untuk dikelola</h2><p>Data {view === 'wilayah' ? 'kelurahan, RW, dan RT' : 'akun kader dan relawan'} akan tampil di sini.</p></div></section>
  return <><div className="page-heading dashboard-heading"><div><p className="eyebrow">DASHBOARD LAPANGAN</p><h1>{title}</h1><p>Berikut ringkasan pendataan wilayah kerja {pkmName} hari ini.</p></div><button className="primary" onClick={() => setView('entry')} type="button">+ Input data rumah</button></div><div className="stat-grid"><article className="stat-card"><span className="stat-icon teal">⌂</span><div><p>Rumah terdata</p><strong>128</strong><small>+ 12 minggu ini</small></div></article><article className="stat-card"><span className="stat-icon coral">♙</span><div><p>Total jiwa</p><strong>496</strong><small>Di RW 05</small></div></article><article className="stat-card"><span className="stat-icon gold">✓</span><div><p>Data tersinkron</p><strong>127</strong><small>Terakhir 10.08 WIB</small></div></article></div><section className="section-head"><div><h2>Aktivitas terbaru</h2><p>Data rumah tangga yang Anda entri hari ini</p></div><button className="text-button" type="button">Lihat semua</button></section><section className="entry-list">{entries.map((entry) => <article className="entry-row" key={entry.id}><div className="house-icon">⌂</div><div className="entry-detail"><strong>{entry.kepala}</strong><span>{entry.id} · {entry.location}</span></div><div className="entry-status"><span className={entry.status === 'Tersinkron' ? 'status synced' : 'status pending'}>{entry.status}</span><small>{entry.time} WIB</small></div></article>)}</section></>
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

  async function loadEntries() {
    if (!supabase || !profile) {
      console.log('loadEntries: supabase or profile missing', { supabase: !!supabase, profile: !!profile })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.from('entries').select('*').eq('officer_id', profile.id).order('entry_date', { ascending: false })
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
        data.map(async (entry: any) => {
          const { data: fcData } = await supabase!.from('family_cards').select('*').eq('entry_id', entry.id)
          const { data: qrData } = await supabase!.from('questionnaire_responses').select('*').in('family_card_id', fcData?.map((fc: any) => fc.id) || [])
          return {
            ...entry,
            familyCards: fcData || [],
            questionnaireResponses: qrData || []
          }
        })
      )
      setEntries(entriesWithDetails)
    } catch (err) {
      console.error('Unexpected error in loadEntries:', err)
      setError(`Terjadi kesalahan: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function getNextEntryNumber() {
    if (!supabase || !profile) {
      console.log('getNextEntryNumber: supabase or profile missing', { supabase: !!supabase, profile: !!profile })
      return
    }
    try {
      const { data, error } = await supabase.rpc('get_next_entry_number', { officer_id: profile.id })
      console.log('getNextEntryNumber result:', { data, error: error?.message })
      if (error) {
        console.error('Error getting next entry number:', error)
        // Fallback to local calculation if RPC fails
        const maxEntryNumber = entries.length > 0 ? Math.max(...entries.map(e => e.entryNumber)) : 0
        setNextEntryNumber(maxEntryNumber + 1)
        return
      }
      if (data) setNextEntryNumber(data)
    } catch (err) {
      console.error('Unexpected error in getNextEntryNumber:', err)
      // Fallback to local calculation
      const maxEntryNumber = entries.length > 0 ? Math.max(...entries.map(e => e.entryNumber)) : 0
      setNextEntryNumber(maxEntryNumber + 1)
    }
  }

  useEffect(() => {
    void loadEntries()
    void getNextEntryNumber()
  }, [profile])

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
        // Create entry
        const { data: newEntry, error: entryError } = await supabase.from('entries').insert({
          entry_number: nextEntryNumber,
          entry_date: String(data.get('entryDate')),
          officer_id: profile.id,
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
        <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
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
              {userKelurahan.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </label>
          <label>RW
            <select value={selectedRwId} onChange={(e) => setSelectedRwId(e.target.value)} disabled={!selectedKelurahanId} required>
              <option value="">Pilih RW</option>
              {userRw.filter(r => !selectedKelurahanId || r.kelurahanId === selectedKelurahanId).map(r => <option key={r.id} value={r.id}>RW {r.name}</option>)}
            </select>
          </label>
          <label>RT
            <select value={selectedRtId} onChange={(e) => setSelectedRtId(e.target.value)} disabled={!selectedRwId} required>
              <option value="">Pilih RT</option>
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
              <strong>KK #{fc.kkSequence}</strong>
              <button className="text-button" onClick={() => removeFamilyCard(index)} type="button">Hapus</button>
            </div>
            <div className="form-grid">
              <label>No. KK<input value={fc.kkNumber} onChange={(e) => {
                const updated = [...familyCards]
                updated[index].kkNumber = e.target.value
                setFamilyCards(updated)
              }} placeholder="16 digit nomor KK" required /></label>
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
                    <h3 style={{ marginBottom: '12px', textTransform: 'capitalize' }}>{pillar.replace('_', ' ')}</h3>
                    {questions.map(q => {
                      const tempFamilyCardId = fc.id || `temp-${index}`
                      return (
                        <div key={q.code} style={{ marginBottom: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={questionnaireResponses.find(qr => 
                                qr.familyCardId === tempFamilyCardId && qr.pillar === pillar && qr.questionCode === q.code
                              )?.answer || false}
                              onChange={(e) => handleQuestionnaireChange(pillar, q.code, e.target.checked)}
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

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="text-button" onClick={() => setFormOpen(false)} type="button">Batal</button>
      </div>
    </form>}

    {!formOpen && entries.length === 0 && <div className="empty-state"><span>⌂</span><h2>Belum ada data entry</h2><p>Klik tombol di atas untuk menambahkan data entry baru.</p></div>}

    {!formOpen && entries.length > 0 && <section className="entry-list">
      {entries.map(entry => (
        <article className="entry-row" key={entry.id}>
          <div className="house-icon">⌂</div>
          <div className="entry-detail">
            <strong>Entry #{entry.entryNumber}</strong>
            <span>{entry.entryDate} · {entry.familyCards.length} KK</span>
          </div>
          <div className="entry-actions">
            <button className="text-button" onClick={() => openForm(entry)} type="button">Edit</button>
            <button className="text-button" onClick={() => deleteEntry(entry)} type="button">Hapus</button>
          </div>
        </article>
      ))}
    </section>}
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
    if (!supabase) return
    setLoading(true)
    const { data, error: loadError } = await supabase.from('pkm_info').select('*').single()
    if (!loadError && data) {
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
    }
    setLoading(false)
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

function LokasiPage({ kelurahan, rw, rt }: { kelurahan: Region[]; rw: Region[]; rt: Region[] }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedKelurahanId, setSelectedKelurahanId] = useState('')
  const [selectedRwId, setSelectedRwId] = useState('')
  const [selectedRtId, setSelectedRtId] = useState('')

  async function loadLocations() {
    if (!supabase) return
    setLoading(true)
    const { data, error: loadError } = await supabase.from('locations').select('*').order('name')
    if (!loadError && data) {
      setLocations((data as LocationRow[]).map(mapLocationRow))
    }
    setLoading(false)
  }

  useEffect(() => { void loadLocations() }, [])

  function openForm(location?: Location) {
    setEditing(location ?? null)
    setError('')
    setSelectedKelurahanId(location?.kelurahanId ?? '')
    setSelectedRwId(location?.rwId ?? '')
    setSelectedRtId(location?.rtId ?? '')
    setFormOpen(true)
  }

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
      void loadLocations()
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
    void loadLocations()
  }

  const rwOptions = rw.filter((item) => item.kelurahanId === selectedKelurahanId)
  const rtOptions = rt.filter((item) => item.rwId === selectedRwId)

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">DATA MASTER</p><h1>Data Lokasi</h1><p>Kelola lokasi untuk pemeriksaan air dan udara.</p></div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah Lokasi</button>
    </div>

    {formOpen && <form className="region-form" onSubmit={save}>
      <strong>{editing ? 'Edit' : 'Tambah'} Lokasi</strong>
      {error && <div className="auth-error">{error}</div>}
      <div className="region-form-fields">
        <label>Nama Lokasi<input defaultValue={editing?.name} name="name" required /></label>
        <label>Kode Lokasi<input defaultValue={editing?.code} name="code" /></label>
        <label>Alamat<textarea defaultValue={editing?.address} name="address" rows={2} /></label>
        <label>Kelurahan<select name="kelurahanId" onChange={(event) => { setSelectedKelurahanId(event.target.value); setSelectedRwId(''); setSelectedRtId('') }} value={selectedKelurahanId}><option value="">Pilih kelurahan</option>{kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>RW<select disabled={!selectedKelurahanId} name="rwId" onChange={(event) => setSelectedRwId(event.target.value)} value={selectedRwId}><option value="">Pilih RW</option>{rwOptions.map((item) => <option key={item.id} value={item.id}>RW {item.name}</option>)}</select></label>
        <label>RT<select defaultValue={editing?.rtId ?? ''} disabled={!selectedRwId} name="rtId" onChange={(event) => setSelectedRtId(event.target.value)} value={selectedRtId}><option value="">Pilih RT</option>{rtOptions.map((item) => <option key={item.id} value={item.id}>RT {item.name}</option>)}</select></label>
        <label>Latitude<input type="number" step="any" defaultValue={editing?.latitude} name="latitude" /></label>
        <label>Longitude<input type="number" step="any" defaultValue={editing?.longitude} name="longitude" /></label>
        <label className="wide">Deskripsi<textarea defaultValue={editing?.description} name="description" rows={3} /></label>
      </div>
      <div className="form-actions"><button className="secondary" onClick={() => setFormOpen(false)} type="button">Batal</button><button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan…' : 'Simpan'}</button></div>
    </form>}

    <div className="region-list">
      {loading ? <div className="empty-state"><span>♙</span><h2>Memuat data lokasi…</h2></div> : locations.length === 0 ? <div className="empty-state"><span>♙</span><h2>Belum ada lokasi</h2><p>Tambahkan lokasi untuk mulai melakukan pemeriksaan.</p></div> : locations.map((location) => <article className="region-row" key={location.id}>
        <div><strong>{location.name}</strong><small>{location.code || '-'} · {location.address || '-'} · {kelurahan.find(k => k.id === location.kelurahanId)?.name || '-'}</small></div>
        <div className="row-actions">
          <button className="edit-button" onClick={() => openForm(location)} type="button">Edit</button>
          <button className="delete-button" onClick={() => remove(location)} type="button">Hapus</button>
        </div>
      </article>)}
    </div>
  </section>
}

function UjiAirPage({ profile, locations }: { profile: UserProfile | null; locations: Location[] }) {
  const [tests, setTests] = useState<WaterQualityTest[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WaterQualityTest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    locationId: '',
    testDate: new Date().toISOString().split('T')[0],
    temperatureValue: '',
    temperatureUnit: 'C' as 'K' | 'C' | 'F' | 'R',
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

  async function loadTests() {
    if (!supabase || !profile) return
    setLoading(true)
    const { data, error: loadError } = await supabase.from('water_quality_tests').select('*').eq('officer_id', profile.id).order('test_date', { ascending: false })
    if (!loadError && data) {
      setTests((data as WaterQualityTestRow[]).map(mapWaterQualityTestRow))
    }
    setLoading(false)
  }

  useEffect(() => { void loadTests() }, [profile])

  function openForm(test?: WaterQualityTest) {
    setEditing(test ?? null)
    setError('')
    if (test) {
      setFormData({
        locationId: test.locationId,
        testDate: test.testDate,
        temperatureValue: test.temperatureValue?.toString() || '',
        temperatureUnit: test.temperatureUnit,
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
        locationId: '',
        testDate: new Date().toISOString().split('T')[0],
        temperatureValue: '',
        temperatureUnit: 'C',
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    
    setSubmitting(true)
    setError('')

    try {
      const payload = {
        location_id: formData.locationId,
        test_date: formData.testDate,
        officer_id: profile.id,
        temperature_value: formData.temperatureValue ? parseFloat(formData.temperatureValue) : null,
        temperature_unit: formData.temperatureUnit,
        tds_value: formData.tdsValue ? parseFloat(formData.tdsValue) : null,
        turbidity_value: formData.turbidityValue ? parseFloat(formData.turbidityValue) : null,
        color_value: formData.colorValue || null,
        odor_value: formData.odorValue || null,
        ph_value: formData.phValue ? parseFloat(formData.phValue) : null,
        nitrite_value: formData.nitriteValue ? parseFloat(formData.nitriteValue) : null,
        nitrate_value: formData.nitrateValue ? parseFloat(formData.nitrateValue) : null,
        chromium_value: formData.chromiumValue ? parseFloat(formData.chromiumValue) : null,
        iron_value: formData.ironValue ? parseFloat(formData.ironValue) : null,
        manganese_value: formData.manganeseValue ? parseFloat(formData.manganeseValue) : null,
        chlorine_value: formData.chlorineValue ? parseFloat(formData.chlorineValue) : null,
        fluoride_value: formData.fluorideValue ? parseFloat(formData.fluorideValue) : null,
        aluminum_value: formData.aluminumValue ? parseFloat(formData.aluminumValue) : null,
        e_coli_value: formData.eColiValue ? parseFloat(formData.eColiValue) : null,
        coliform_value: formData.coliformValue ? parseFloat(formData.coliformValue) : null,
        notes: formData.notes || null,
      }

      if (editing) {
        const { error: updateError } = await supabase.from('water_quality_tests').update(payload).eq('id', editing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('water_quality_tests').insert(payload)
        if (insertError) throw insertError
      }

      setFormOpen(false)
      void loadTests()
    } catch (err) {
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

  if (loading) return <main className="auth-shell"><p className="auth-loading">Memuat data uji air…</p></main>

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">PEMERIKSAAN</p><h1>Hasil Uji Pemeriksaan Air</h1><p>Kelola hasil uji kualitas air dari berbagai lokasi.</p></div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah Uji Air</button>
    </div>

    {formOpen && <form className="entry-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMERIKSAAN</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Uji Air</h1>
          <p>Lengkapi data hasil uji pemeriksaan air.</p>
        </div>
        <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
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
          </label>
          <label>Tanggal Uji
            <input type="date" value={formData.testDate} onChange={(e) => setFormData({ ...formData, testDate: e.target.value })} required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>A. Pemeriksaan Parameter Fisik</h2>
        <div className="form-grid">
          <label>Suhu
            <div className="inline-fields">
              <input type="number" step="any" value={formData.temperatureValue} onChange={(e) => setFormData({ ...formData, temperatureValue: e.target.value })} placeholder="Nilai" />
              <select value={formData.temperatureUnit} onChange={(e) => setFormData({ ...formData, temperatureUnit: e.target.value as 'K' | 'C' | 'F' | 'R' })}>
                <option value="K">Kelvin (K)</option>
                <option value="C">Celcius (C)</option>
                <option value="F">Fahrenheit (F)</option>
                <option value="R">Reamur (R)</option>
              </select>
            </div>
          </label>
          <label>TDS<input type="number" step="any" value={formData.tdsValue} onChange={(e) => setFormData({ ...formData, tdsValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Kekeruhan<input type="number" step="any" value={formData.turbidityValue} onChange={(e) => setFormData({ ...formData, turbidityValue: e.target.value })} placeholder="NTU" /></label>
          <label>Warna<input value={formData.colorValue} onChange={(e) => setFormData({ ...formData, colorValue: e.target.value })} placeholder="TCU" /></label>
          <label>Bau<input value={formData.odorValue} onChange={(e) => setFormData({ ...formData, odorValue: e.target.value })} placeholder="Deskripsi bau" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>B. Pemeriksaan Kimia</h2>
        <div className="form-grid">
          <label>pH<input type="number" step="any" value={formData.phValue} onChange={(e) => setFormData({ ...formData, phValue: e.target.value })} placeholder="0-14" /></label>
          <label>Nitrit (N'a)<input type="number" step="any" value={formData.nitriteValue} onChange={(e) => setFormData({ ...formData, nitriteValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Nitrat (Ni)<input type="number" step="any" value={formData.nitrateValue} onChange={(e) => setFormData({ ...formData, nitrateValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Chromium (Cr)<input type="number" step="any" value={formData.chromiumValue} onChange={(e) => setFormData({ ...formData, chromiumValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Besi (Fe)<input type="number" step="any" value={formData.ironValue} onChange={(e) => setFormData({ ...formData, ironValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Mangan (Mg)<input type="number" step="any" value={formData.manganeseValue} onChange={(e) => setFormData({ ...formData, manganeseValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Chlorine<input type="number" step="any" value={formData.chlorineValue} onChange={(e) => setFormData({ ...formData, chlorineValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Fluorida (Fl)<input type="number" step="any" value={formData.fluorideValue} onChange={(e) => setFormData({ ...formData, fluorideValue: e.target.value })} placeholder="mg/L" /></label>
          <label>Aluminium (Al)<input type="number" step="any" value={formData.aluminumValue} onChange={(e) => setFormData({ ...formData, aluminumValue: e.target.value })} placeholder="mg/L" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>C. Pemeriksaan Mikrobiologi</h2>
        <div className="form-grid">
          <label>E-coli<input type="number" step="any" value={formData.eColiValue} onChange={(e) => setFormData({ ...formData, eColiValue: e.target.value })} placeholder="MPN/100ml" /></label>
          <label>Coliform<input type="number" step="any" value={formData.coliformValue} onChange={(e) => setFormData({ ...formData, coliformValue: e.target.value })} placeholder="MPN/100ml" /></label>
        </div>
      </section>

      <section className="form-section">
        <h2>Catatan</h2>
        <label className="wide">Catatan Tambahan<textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Catatan tambahan..." /></label>
      </section>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="text-button" onClick={() => setFormOpen(false)} type="button">Batal</button>
      </div>
    </form>}

    {!formOpen && tests.length === 0 && <div className="empty-state"><span>💧</span><h2>Belum ada data uji air</h2><p>Klik tombol di atas untuk menambahkan hasil uji air baru.</p></div>}

    {!formOpen && tests.length > 0 && <section className="entry-list">
      {tests.map(test => (
        <article className="entry-row" key={test.id}>
          <div className="house-icon">💧</div>
          <div className="entry-detail">
            <strong>{locations.find(l => l.id === test.locationId)?.name || 'Unknown'}</strong>
            <span>{test.testDate} · Suhu: {test.temperatureValue}{test.temperatureUnit} · pH: {test.phValue || '-'}</span>
          </div>
          <div className="entry-actions">
            <button className="text-button" onClick={() => openForm(test)} type="button">Edit</button>
            <button className="text-button" onClick={() => remove(test)} type="button">Hapus</button>
          </div>
        </article>
      ))}
    </section>}
  </section>
}

function UjiUdaraPage({ profile, locations }: { profile: UserProfile | null; locations: Location[] }) {
  const [tests, setTests] = useState<AirQualityTest[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AirQualityTest | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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

  async function loadTests() {
    if (!supabase || !profile) return
    setLoading(true)
    const { data, error: loadError } = await supabase.from('air_quality_tests').select('*').eq('officer_id', profile.id).order('test_date', { ascending: false })
    if (!loadError && data) {
      setTests((data as AirQualityTestRow[]).map(mapAirQualityTestRow))
    }
    setLoading(false)
  }

  useEffect(() => { void loadTests() }, [profile])

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
        locationId: '',
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

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !profile) return
    
    setSubmitting(true)
    setError('')

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

      if (editing) {
        const { error: updateError } = await supabase.from('air_quality_tests').update(payload).eq('id', editing.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('air_quality_tests').insert(payload)
        if (insertError) throw insertError
      }

      setFormOpen(false)
      void loadTests()
    } catch (err) {
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

  if (loading) return <main className="auth-shell"><p className="auth-loading">Memuat data uji udara…</p></main>

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">PEMERIKSAAN</p><h1>Hasil Uji Kualitas Udara</h1><p>Kelola hasil uji kualitas udara dari berbagai lokasi.</p></div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah Uji Udara</button>
    </div>

    {formOpen && <form className="entry-form" onSubmit={save}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEMERIKSAAN</p>
          <h1>{editing ? 'Edit' : 'Tambah'} Uji Udara</h1>
          <p>Lengkapi data hasil uji kualitas udara.</p>
        </div>
        <button className="primary" type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</button>
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
          </label>
          <label>Tanggal Uji
            <input type="date" value={formData.testDate} onChange={(e) => setFormData({ ...formData, testDate: e.target.value })} required />
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Parameter Kualitas Udara</h2>
        <div className="form-grid">
          <label>Suhu
            <div className="inline-fields">
              <input type="number" step="any" value={formData.temperature1} onChange={(e) => setFormData({ ...formData, temperature1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.temperature2} onChange={(e) => setFormData({ ...formData, temperature2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.temperature3} onChange={(e) => setFormData({ ...formData, temperature3: e.target.value })} placeholder="Pengukuran 3" />
              <select value={formData.temperatureUnit} onChange={(e) => setFormData({ ...formData, temperatureUnit: e.target.value as 'K' | 'C' | 'F' | 'R' })}>
                <option value="K">K</option>
                <option value="C">C</option>
                <option value="F">F</option>
                <option value="R">R</option>
              </select>
            </div>
          </label>
          <label>Kelembapan
            <div className="inline-fields">
              <input type="number" step="any" value={formData.humidity1} onChange={(e) => setFormData({ ...formData, humidity1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.humidity2} onChange={(e) => setFormData({ ...formData, humidity2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.humidity3} onChange={(e) => setFormData({ ...formData, humidity3: e.target.value })} placeholder="Pengukuran 3" />
            </div>
          </label>
          <label>Kebisingan
            <div className="inline-fields">
              <input type="number" step="any" value={formData.noise1} onChange={(e) => setFormData({ ...formData, noise1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.noise2} onChange={(e) => setFormData({ ...formData, noise2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.noise3} onChange={(e) => setFormData({ ...formData, noise3: e.target.value })} placeholder="Pengukuran 3" />
            </div>
          </label>
          <label>Pencahayaan
            <div className="inline-fields">
              <input type="number" step="any" value={formData.lighting1} onChange={(e) => setFormData({ ...formData, lighting1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.lighting2} onChange={(e) => setFormData({ ...formData, lighting2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.lighting3} onChange={(e) => setFormData({ ...formData, lighting3: e.target.value })} placeholder="Pengukuran 3" />
            </div>
          </label>
          <label>PM 2.5
            <div className="inline-fields">
              <input type="number" step="any" value={formData.pm25_1} onChange={(e) => setFormData({ ...formData, pm25_1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.pm25_2} onChange={(e) => setFormData({ ...formData, pm25_2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.pm25_3} onChange={(e) => setFormData({ ...formData, pm25_3: e.target.value })} placeholder="Pengukuran 3" />
            </div>
          </label>
          <label>PM 10
            <div className="inline-fields">
              <input type="number" step="any" value={formData.pm10_1} onChange={(e) => setFormData({ ...formData, pm10_1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.pm10_2} onChange={(e) => setFormData({ ...formData, pm10_2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.pm10_3} onChange={(e) => setFormData({ ...formData, pm10_3: e.target.value })} placeholder="Pengukuran 3" />
            </div>
          </label>
          <label>Laju Ventilasi
            <div className="inline-fields">
              <input type="number" step="any" value={formData.ventilationRate1} onChange={(e) => setFormData({ ...formData, ventilationRate1: e.target.value })} placeholder="Pengukuran 1" />
              <input type="number" step="any" value={formData.ventilationRate2} onChange={(e) => setFormData({ ...formData, ventilationRate2: e.target.value })} placeholder="Pengukuran 2" />
              <input type="number" step="any" value={formData.ventilationRate3} onChange={(e) => setFormData({ ...formData, ventilationRate3: e.target.value })} placeholder="Pengukuran 3" />
            </div>
          </label>
        </div>
      </section>

      <section className="form-section">
        <h2>Catatan</h2>
        <label className="wide">Catatan Tambahan<textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} placeholder="Catatan tambahan..." /></label>
      </section>

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button className="text-button" onClick={() => setFormOpen(false)} type="button">Batal</button>
      </div>
    </form>}

    {!formOpen && tests.length === 0 && <div className="empty-state"><span>🌬️</span><h2>Belum ada data uji udara</h2><p>Klik tombol di atas untuk menambahkan hasil uji udara baru.</p></div>}

    {!formOpen && tests.length > 0 && <section className="entry-list">
      {tests.map(test => (
        <article className="entry-row" key={test.id}>
          <div className="house-icon">🌬️</div>
          <div className="entry-detail">
            <strong>{locations.find(l => l.id === test.locationId)?.name || 'Unknown'}</strong>
            <span>{test.testDate} · Suhu: {test.temperature1}{test.temperatureUnit} · PM2.5: {test.pm25_1}</span>
          </div>
          <div className="entry-actions">
            <button className="text-button" onClick={() => openForm(test)} type="button">Edit</button>
            <button className="text-button" onClick={() => remove(test)} type="button">Hapus</button>
          </div>
        </article>
      ))}
    </section>}
  </section>
}

function LoginPage() {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  return <main className="auth-shell">
    <form className="auth-card" onSubmit={submit}>
      <div className="brand-mark large">S</div>
      <h1>SIGESIT</h1>
      <p>Masuk untuk mengelola pendataan Sandas PKM Padasuka.</p>
      {error && <div className="auth-error">{error}</div>}
      <label>Email<input autoComplete="username" name="email" required type="email" /></label>
      <label>Kata sandi<input autoComplete="current-password" name="password" required type="password" /></label>
      <button className="primary" disabled={submitting} type="submit">{submitting ? 'Memproses…' : 'Masuk'}</button>
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
  const [moduleAccess, setModuleAccess] = useState({ entry: true, wilayah: true, pengguna: false, lokasi: true, uji_air: true, uji_udara: true })

  async function loadUsers() {
    if (!supabase) return
    setLoading(true)
    const { data, error: loadError } = await supabase.from('pkm_profiles').select('*').order('full_name')
    if (!loadError && data) setUsers((data as ProfileRow[]).map(mapProfileRow))
    setLoading(false)
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
    setModuleAccess(user?.moduleAccess || { entry: true, wilayah: true, pengguna: false, lokasi: true, uji_air: true, uji_udara: true })
    setFormOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const data = new FormData(event.currentTarget)
    const nik = String(data.get('nik') ?? '').trim()
    
    // NIK uniqueness validation
    if (!editing && nik) {
      const { data: existingUser } = await supabase.from('pkm_profiles').select('id').eq('nik', nik).single()
      if (existingUser) {
        setError('NIK sudah terdaftar. Gunakan NIK yang berbeda.')
        return
      }
    }
    
    let username = editing?.username
    let password = String(data.get('password') ?? '').trim()
    
    // Auto-generate username and password for new users
    if (!editing) {
      username = generateUsername(nik)
      password = generatePassword()
    }
    
    const payload = {
      action: editing ? 'update' : 'create',
      id: editing?.id,
      email: `${username}@sigesit.local`,
      password: password || undefined,
      fullName: String(data.get('fullName') ?? '').trim(),
      username: username,
      nik: nik,
      phone: String(data.get('phone') ?? '').trim(),
      role: 'kader',
      kelurahanId: String(data.get('kelurahanId') ?? '') || undefined,
      rwId: String(data.get('rwId') ?? '') || undefined,
      rtId: String(data.get('rtId') ?? '') || undefined,
      isActive: data.get('isActive') === 'on',
      moduleAccess: moduleAccess,
    }
    
    if (!editing && !payload.password) { setError('Kata sandi wajib diisi untuk akun baru.'); return }
    setSubmitting(true)
    setError('')
    console.log('Sending payload to Edge Function:', payload)
    const { data: result, error: invokeError } = await supabase.functions.invoke('admin-users', { body: payload })
    console.log('Edge Function response:', { result, invokeError: JSON.stringify(invokeError) })
    setSubmitting(false)
    const resultError = (result as { error?: string } | null)?.error
    const functionError = invokeError ? await getFunctionErrorMessage(invokeError) : null
    if (invokeError || resultError) { setError(resultError ?? functionError ?? 'Gagal menyimpan pengguna.'); return }
    
    if (!editing) {
      // Show generated credentials
      alert(`User berhasil dibuat!\n\nUsername: ${username}\nPassword: ${password}\n\nSimpan credentials ini untuk user.`)
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

  const rwOptions = rw.filter((item) => item.kelurahanId === selectedKelurahanId)
  const rtOptions = rt.filter((item) => item.rwId === selectedRwId)

  return <section className="master-page">
    <div className="page-heading">
      <div><p className="eyebrow">DATA MASTER</p><h1>Pengguna Kader & Relawan</h1><p>Kelola akun kader, relawan, dan admin yang dapat mengakses SIGESIT.</p></div>
      <button className="primary" onClick={() => openForm()} type="button">+ Tambah pengguna</button>
    </div>
    {formOpen && <form className="region-form" onSubmit={submit}>
      <strong>{editing ? 'Edit' : 'Tambah'} pengguna kader/relawan</strong>
      {error && <div className="auth-error">{error}</div>}
      <div className="region-form-fields">
        <label>Nama lengkap<input defaultValue={editing?.fullName} name="fullName" required /></label>
        <label>NIK (16 digit)<input defaultValue={editing?.nik} maxLength={16} minLength={16} name="nik" required type="text" /></label>
        <label>No. HP<input defaultValue={editing?.phone} name="phone" required type="tel" /></label>
        <label>Kelurahan<select name="kelurahanId" onChange={(event) => { setSelectedKelurahanId(event.target.value); setSelectedRwId('') }} value={selectedKelurahanId} required><option value="">Pilih kelurahan</option>{kelurahan.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>RW<select disabled={!selectedKelurahanId} name="rwId" onChange={(event) => setSelectedRwId(event.target.value)} value={selectedRwId} required><option value="">Pilih RW</option>{rwOptions.map((item) => <option key={item.id} value={item.id}>RW {item.name}</option>)}</select></label>
        <label>RT<select defaultValue={editing?.rtId ?? ''} disabled={!selectedRwId} name="rtId" required><option value="">Pilih RT</option>{rtOptions.map((item) => <option key={item.id} value={item.id}>RT {item.name}</option>)}</select></label>
        <label>Status<select defaultValue={editing?.isActive === false ? 'off' : 'on'} name="isActive"><option value="on">Aktif</option><option value="off">Nonaktif</option></select></label>
        {!editing && <div className="module-access">
          <label className="checkbox-label"><input checked={moduleAccess.entry} onChange={(e) => setModuleAccess({...moduleAccess, entry: e.target.checked})} type="checkbox" /> Akses modul Entry</label>
          <label className="checkbox-label"><input checked={moduleAccess.wilayah} onChange={(e) => setModuleAccess({...moduleAccess, wilayah: e.target.checked})} type="checkbox" /> Akses modul Wilayah</label>
          <label className="checkbox-label"><input checked={moduleAccess.pengguna} onChange={(e) => setModuleAccess({...moduleAccess, pengguna: e.target.checked})} type="checkbox" /> Akses modul Pengguna</label>
          <label className="checkbox-label"><input checked={moduleAccess.lokasi} onChange={(e) => setModuleAccess({...moduleAccess, lokasi: e.target.checked})} type="checkbox" /> Akses modul Lokasi</label>
          <label className="checkbox-label"><input checked={moduleAccess.uji_air} onChange={(e) => setModuleAccess({...moduleAccess, uji_air: e.target.checked})} type="checkbox" /> Akses modul Uji Air</label>
          <label className="checkbox-label"><input checked={moduleAccess.uji_udara} onChange={(e) => setModuleAccess({...moduleAccess, uji_udara: e.target.checked})} type="checkbox" /> Akses modul Uji Udara</label>
        </div>}
        {!editing && <div className="generated-info">
          <p><strong>Username:</strong> Akan digenerate otomatis (5 digit terakhir NIK + 3 huruf unik)</p>
          <p><strong>Password:</strong> Akan digenerate otomatis (12 karakter)</p>
        </div>}
      </div>
      <div className="form-actions"><button className="secondary" onClick={() => setFormOpen(false)} type="button">Batal</button><button className="primary" disabled={submitting} type="submit">{submitting ? 'Menyimpan…' : 'Simpan'}</button></div>
    </form>}
    <div className="region-list">
      {loading ? <div className="empty-state"><span>♙</span><h2>Memuat data pengguna…</h2></div> : users.length === 0 ? <div className="empty-state"><span>♙</span><h2>Belum ada pengguna</h2><p>Tambahkan akun kader atau admin untuk mulai mengelola akses.</p></div> : users.map((user) => <article className="region-row" key={user.id}>
        <div><strong>{user.fullName}</strong><small>{user.username} · {user.email} · {user.role === 'super_admin' ? 'Super Admin' : 'Kader'} {!user.isActive && '· Nonaktif'}</small></div>
        <div className="row-actions">
          <button className="edit-button" onClick={() => openForm(user)} type="button">Edit</button>
          <button className="secondary" onClick={() => toggleActive(user)} type="button">{user.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
          <button className="delete-button" onClick={() => removeUser(user)} type="button">Hapus</button>
        </div>
      </article>)}
    </div>
  </section>
}

export default App
