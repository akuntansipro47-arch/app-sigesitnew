import type { FoodInspectionSample, FoodInspectionResult, FoodInspectionRow, ProfileRow, UserProfile, LocationRow, Location, WaterQualityTestRow, WaterQualityTest, AirQualityTestRow, AirQualityTest, PKMInfoRow, PKMInfo } from '../types'

export function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    nik: row.nik,
    phone: row.phone,
    email: row.email,
    role: row.role,
    kelurahanId: row.kelurahan_id ?? undefined,
    rwId: row.rw_id ?? undefined,
    rtId: row.rt_id ?? undefined,
    isActive: row.is_active,
    moduleAccess: { entry: true, wilayah: true, pengguna: false, lokasi: true, uji_air: true, uji_udara: true, pangan: true, group_tpp: true, ...row.module_access },
    isTempPassword: row.is_temp_password ?? false,
  }
}

export function mapLocationRow(row: LocationRow): Location {
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

export function mapWaterQualityTestRow(row: WaterQualityTestRow): WaterQualityTest {
  return {
    id: row.id,
    locationId: row.location_id,
    testDate: row.test_date,
    officerId: row.officer_id,
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

export function mapAirQualityTestRow(row: AirQualityTestRow): AirQualityTest {
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

export function mapPKMInfoRow(row: PKMInfoRow): PKMInfo {
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

export function mapFoodInspectionRow(row: FoodInspectionRow): FoodInspectionResult {
  const rawSamples = row.samples && Array.isArray(row.samples) ? row.samples : []
  const samples: FoodInspectionSample[] = rawSamples.map((s: any) => ({
    nama_makanan: String(s?.nama_makanan ?? s?.nama ?? ''),
    boraks: (s?.boraks ?? '') as 'Positif' | 'Negatif' | '',
    formalin: (s?.formalin ?? '') as 'Positif' | 'Negatif' | '',
    rodaminB: (s?.rodamin_b ?? s?.rodaminB ?? '') as 'Positif' | 'Negatif' | '',
    metanilYellow: (s?.metanil_yellow ?? s?.metanilYellow ?? '') as 'Positif' | 'Negatif' | '',
    eColi: (s?.e_coli ?? s?.eColi ?? '') as 'Positif' | 'Negatif' | '',
    remarks: String(s?.remarks ?? ''),
  }))

  // Fallback to dedicated e_coli_result column for first sample if JSONB is empty
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
  
  // Calculate overall status: if any sample has any positive result, status = "Tidak Lulus / Perlu tindak lanjut"
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
    samples: samples as FoodInspectionSample[],
    officerId: row.officer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    overallStatus: overallStatus as 'Lulus' | 'Tidak Lulus / Perlu tindak lanjut',
  }
}

export function toDbNumberValue(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '' || isNaN(Number(trimmed))) return null
  return Number(trimmed)
}

export function formatInspectionResult(value: 'Positif' | 'Negatif' | ''): string {
  if (!value) return '-'
  return value
}

export function getIklBadgeColor(hasilIkl: 'MMS' | 'TMS' | ''): string {
  if (hasilIkl === 'MMS') return 'ikl-mms'
  if (hasilIkl === 'TMS') return 'ikl-tms'
  return ''
}

export async function getFunctionErrorMessage(error: unknown): Promise<string | null> {
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

export function isEmptyUjiAirValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

export function isUjiAirValueValid(input: string, _mode: 'partial' | 'final'): boolean {
  const next = input.replace(/\s+/g, '')
  if (next === '') return true
  return !/[A-Za-z]/.test(next)
}

export function toDbTextValue(input: string): string | null {
  const trimmed = input.trim()
  return trimmed === '' ? null : trimmed
}

export function toDbUjiAirValue(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  return trimmed
}

export function formatWaterValue(value: number | string | null | undefined, unit?: string): string {
  if (isEmptyUjiAirValue(value)) return '-'
  const text = typeof value === 'number' ? String(value) : String(value).trim()
  if (text === '') return '-'
  return unit ? `${text} ${unit}` : text
}

export const ujiAirDisallowedAlphabetPattern = /[A-Za-z]/
