export type View = 'beranda' | 'entry' | 'wilayah' | 'pengguna' | 'profile' | 'lokasi' | 'uji_air' | 'uji_udara' | 'pangan' | 'group_tpp'
export type RegionLevel = 'kelurahan' | 'rw' | 'rt'
export type UserRole = 'super_admin' | 'kader'

export type ModuleAccess = {
  entry: boolean
  wilayah: boolean
  pengguna: boolean
  lokasi: boolean
  uji_air: boolean
  uji_udara: boolean
  pangan: boolean
  group_tpp: boolean
}

export type UserProfile = {
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

export type ProfileRow = {
  id: string
  full_name: string
  username: string
  nik: string
  phone: string
  email: string | null
  role: UserRole
  kelurahan_id: string | null
  rw_id: string | null
  rt_id: string | null
  is_active: boolean
  module_access: Partial<ModuleAccess> | null
  is_temp_password: boolean | null
}

export type Location = {
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

export type LocationRow = {
  id: string
  name: string
  code: string | null
  address: string | null
  kelurahan_id: string | null
  rw_id: string | null
  rt_id: string | null
  latitude: number | null
  longitude: number | null
  description: string | null
}

export type WaterQualityTest = {
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

export type WaterQualityTestRow = {
  id: string
  location_id: string
  test_date: string
  officer_id: string
  water_temperature_value: number | string | null
  water_temperature_unit: string
  air_temperature_value: number | string | null
  air_temperature_unit: string
  tds_value: number | string | null
  turbidity_value: number | string | null
  color_value: string | null
  odor_value: string | null
  ph_value: number | string | null
  nitrite_value: number | string | null
  nitrate_value: number | string | null
  chromium_value: number | string | null
  iron_value: number | string | null
  manganese_value: number | string | null
  chlorine_value: number | string | null
  fluoride_value: number | string | null
  aluminum_value: number | string | null
  e_coli_value: number | string | null
  coliform_value: number | string | null
  notes: string | null
}

export type AirQualityTest = {
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

export type AirQualityTestRow = {
  id: string
  location_id: string
  test_date: string
  officer_id: string
  temperature_1: number | null
  temperature_2: number | null
  temperature_3: number | null
  temperature_unit: string
  humidity_1: number | null
  humidity_2: number | null
  humidity_3: number | null
  noise_1: number | null
  noise_2: number | null
  noise_3: number | null
  lighting_1: number | null
  lighting_2: number | null
  lighting_3: number | null
  pm25_1: number | null
  pm25_2: number | null
  pm25_3: number | null
  pm10_1: number | null
  pm10_2: number | null
  pm10_3: number | null
  ventilation_rate_1: number | null
  ventilation_rate_2: number | null
  ventilation_rate_3: number | null
  notes: string | null
}

export type PKMInfo = {
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

export type PKMInfoRow = {
  id: string
  nama_pkm: string
  alamat_pkm: string
  no_telepon: string
  penanggung_jawab: string
  website: string | null
  instagram: string | null
  facebook: string | null
  twitter: string | null
  logo_url: string | null
  logo_storage_path: string | null
}

export type FamilyCard = {
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

export type QuestionnaireResponse = {
  id: string
  familyCardId: string
  pillar: string
  questionCode: string
  answer: boolean
}

export type Entry = {
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

export type Question = {
  code: string
  text: string
}

export type Region = {
  id: string
  name: string
  code?: string
  kelurahanId?: string
  rwId?: string
}

export type GroupTpp = {
  id: string
  name: string
  createdAt?: string
  updatedAt?: string
}

export type GroupTppRow = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type FoodInspectionSample = {
  nama_makanan: string
  boraks: 'Positif' | 'Negatif' | ''
  formalin: 'Positif' | 'Negatif' | ''
  rodaminB: 'Positif' | 'Negatif' | ''
  metanilYellow: 'Positif' | 'Negatif' | ''
  eColi: 'Positif' | 'Negatif' | ''
  remarks: string
}

export type FoodInspectionResult = {
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

export type FoodInspectionRow = {
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
