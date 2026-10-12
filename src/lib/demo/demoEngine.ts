import {
  DEMO_DB_KEY,
  DEMO_EMAIL,
  DEMO_FILES_KEY,
  DEMO_PASSWORD,
  DEMO_SEED_VERSION,
  DEMO_USER_ID,
  DEMO_USERNAME,
  clearDemoSession,
  demoSafeGet,
  demoSafeSet,
  readDemoSession,
  setDemoActive,
  writeDemoSession,
} from './demoStorage'
import { buildDemoAuthUsers, buildDemoSeed, type DemoAuthUser } from './demoSeed'

// ==================== ENGINE DATABASE DEMO (DEVICE CACHE) ====================
// Mesin penyimpanan lokal yang meniru permukaan API Supabase (PostgREST + Auth)
// untuk mode demo. Semua baca/tulis berjalan terhadap localStorage perangkat,
// sehingga data yang dihasilkan akun demo TIDAK PERNAH masuk ke database utama.

type Row = Record<string, unknown>

export type DemoError = {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

export type DemoResult<T = unknown> = {
  data: T | null
  error: DemoError | null
  count?: number | null
}

type DemoDb = {
  seedVersion: number
  tables: Record<string, Row[]>
  authUsers: DemoAuthUser[]
}

// ---------------------------------------------------------------- Persistence
let cachedDb: DemoDb | null = null

function buildFreshDb(): DemoDb {
  return {
    seedVersion: DEMO_SEED_VERSION,
    tables: buildDemoSeed(),
    authUsers: buildDemoAuthUsers(),
  }
}

function loadDb(): DemoDb {
  if (cachedDb) return cachedDb
  const raw = demoSafeGet(DEMO_DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DemoDb
      if (parsed && parsed.seedVersion === DEMO_SEED_VERSION && parsed.tables && parsed.authUsers) {
        cachedDb = parsed
        return cachedDb
      }
    } catch {
      // Cache korup — buat ulang dari data dummy.
    }
  }
  cachedDb = buildFreshDb()
  persistDb()
  return cachedDb
}

function persistDb(): void {
  if (!cachedDb) return
  try {
    demoSafeSet(DEMO_DB_KEY, JSON.stringify(cachedDb))
  } catch (err) {
    console.warn('[demo] Gagal menyimpan cache demo ke perangkat (kemungkinan penuh):', err)
  }
}

/** Kembalikan seluruh isi cache demo (untuk keperluan debug/reset). */
export function peekDemoDb(): DemoDb {
  return loadDb()
}

function ensureTable(db: DemoDb, table: string): Row[] {
  if (!db.tables[table]) db.tables[table] = []
  return db.tables[table]
}

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // jatuh ke fallback di bawah
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function nowStamp(): string {
  return new Date().toISOString()
}

// ---------------------------------------------------------------- Query builder
type Filter =
  | { type: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'; column: string; value: unknown }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'is'; column: string; value: unknown }
  | { type: 'not'; column: string; operator: string; value: unknown }

type SortSpec = { column: string; ascending: boolean }

type QueryOp = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

function isNullish(value: unknown): boolean {
  return value === null || value === undefined
}

function looseEquals(a: unknown, b: unknown): boolean {
  if (isNullish(a) || isNullish(b)) return isNullish(a) && isNullish(b)
  if (typeof a === 'boolean' || typeof b === 'boolean') return Boolean(a) === Boolean(b)
  return String(a) === String(b)
}

function compareValues(a: unknown, b: unknown): number {
  const aNum = typeof a === 'number' ? a : Number(a)
  const bNum = typeof b === 'number' ? b : Number(b)
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && String(a ?? '').trim() !== '' && String(b ?? '').trim() !== '') {
    return aNum - bNum
  }
  return String(a ?? '').localeCompare(String(b ?? ''), 'id')
}

function rowMatches(row: Row, filter: Filter): boolean {
  const value = row[filter.column]
  switch (filter.type) {
    case 'eq':
      return looseEquals(value, filter.value)
    case 'neq':
      return !looseEquals(value, filter.value)
    case 'gt':
      return !isNullish(value) && compareValues(value, filter.value) > 0
    case 'gte':
      return !isNullish(value) && compareValues(value, filter.value) >= 0
    case 'lt':
      return !isNullish(value) && compareValues(value, filter.value) < 0
    case 'lte':
      return !isNullish(value) && compareValues(value, filter.value) <= 0
    case 'in':
      return filter.values.some((candidate) => looseEquals(value, candidate))
    case 'is':
      return filter.value === null ? isNullish(value) : looseEquals(value, filter.value)
    case 'not': {
      if (filter.operator === 'is' && filter.value === null) return !isNullish(value)
      return !looseEquals(value, filter.value)
    }
    default:
      return true
  }
}

function projectRow(row: Row, columns: string): Row {
  const trimmed = columns.trim()
  if (trimmed === '' || trimmed === '*') return { ...row }
  const picked: Row = {}
  trimmed.split(',').forEach((rawColumn) => {
    const column = rawColumn.trim()
    if (!column) return
    if (column === '*') {
      Object.assign(picked, row)
      return
    }
    const name = column.split(':')[0].trim()
    if (!name) return
    picked[name] = row[name]
  })
  return picked
}

function ensureWriteDefaults(row: Row, table: string): Row {
  const next: Row = { ...row }
  if (isNullish(next.id)) next.id = randomId()
  const stamps = ['created_at', 'updated_at']
  stamps.forEach((column) => {
    if (!(column in next) && table !== 'kelurahan' && table !== 'rw' && table !== 'rt') {
      next[column] = nowStamp()
    }
  })
  return next
}

type SelectOptions = { count?: 'exact' | 'estimated' | 'planned'; head?: boolean }

export class DemoQueryBuilder {
  private readonly table: string
  private op: QueryOp = 'select'
  private filters: Filter[] = []
  private sorts: SortSpec[] = []
  private selectColumns = '*'
  private payload: Row | Row[] | null = null
  private upsertOptions: { onConflict?: string; ignoreDuplicates?: boolean } | null = null
  private returning = false
  private countMode: 'exact' | 'estimated' | 'planned' | null = null
  private headOnly = false
  private rangeFrom: number | null = null
  private rangeTo: number | null = null

  constructor(table: string) {
    this.table = table
  }

  select(columns = '*', options?: SelectOptions): this {
    if (this.op === 'select') {
      this.selectColumns = columns || '*'
    } else {
      this.returning = true
      this.selectColumns = columns || '*'
    }
    if (options?.count) this.countMode = options.count
    if (options?.head) this.headOnly = true
    return this
  }

  insert(values: Row | Row[]): this {
    this.op = 'insert'
    this.payload = values
    return this
  }

  update(values: Row): this {
    this.op = 'update'
    this.payload = values
    return this
  }

  upsert(values: Row | Row[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.op = 'upsert'
    this.payload = values
    this.upsertOptions = options ?? {}
    return this
  }

  delete(): this {
    this.op = 'delete'
    return this
  }

  eq(column: string, value: unknown): this {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: unknown): this {
    this.filters.push({ type: 'neq', column, value })
    return this
  }

  gt(column: string, value: unknown): this {
    this.filters.push({ type: 'gt', column, value })
    return this
  }

  gte(column: string, value: unknown): this {
    this.filters.push({ type: 'gte', column, value })
    return this
  }

  lt(column: string, value: unknown): this {
    this.filters.push({ type: 'lt', column, value })
    return this
  }

  lte(column: string, value: unknown): this {
    this.filters.push({ type: 'lte', column, value })
    return this
  }

  in(column: string, values: unknown[]): this {
    this.filters.push({ type: 'in', column, values: values ?? [] })
    return this
  }

  is(column: string, value: unknown): this {
    this.filters.push({ type: 'is', column, value })
    return this
  }

  not(column: string, operator: string, value: unknown): this {
    this.filters.push({ type: 'not', column, operator, value })
    return this
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.sorts.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  range(from: number, to: number): this {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  limit(count: number): this {
    this.rangeFrom = 0
    this.rangeTo = count - 1
    return this
  }

  then<TResult1 = DemoResult, TResult2 = never>(
    onfulfilled?: ((value: DemoResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected)
  }

  async single(): Promise<DemoResult> {
    const result = await this.execute()
    if (result.error) return result
    const rows = (result.data ?? []) as Row[]
    if (rows.length !== 1) {
      return {
        data: null,
        error: {
          message: 'JSON object requested, multiple (or no) rows returned',
          code: 'PGRST116',
          details: `Rows: ${rows.length}`,
          hint: null,
        },
      }
    }
    return { data: rows[0], error: null }
  }

  async maybeSingle(): Promise<DemoResult> {
    const result = await this.execute()
    if (result.error) return result
    const rows = (result.data ?? []) as Row[]
    if (rows.length > 1) {
      return {
        data: null,
        error: {
          message: 'JSON object requested, multiple rows returned',
          code: 'PGRST116',
          details: `Rows: ${rows.length}`,
          hint: null,
        },
      }
    }
    return { data: rows[0] ?? null, error: null }
  }

  private execute(): Promise<DemoResult> {
    try {
      const db = loadDb()
      const rows = ensureTable(db, this.table)

      if (this.op === 'select') {
        const filtered = rows.filter((row) => this.filters.every((filter) => rowMatches(row, filter)))
        const sorted = this.applySorts(filtered)
        const total = sorted.length
        const page = this.applyRange(sorted)
        const data = this.headOnly ? null : page.map((row) => projectRow(row, this.selectColumns))
        return Promise.resolve({ data, error: null, count: this.countMode ? total : null })
      }

      if (this.op === 'delete') {
        const remaining: Row[] = []
        const removed: Row[] = []
        rows.forEach((row) => {
          if (this.filters.every((filter) => rowMatches(row, filter))) removed.push(row)
          else remaining.push(row)
        })
        db.tables[this.table] = remaining
        persistDb()
        return Promise.resolve({
          data: this.returning ? removed.map((row) => projectRow(row, this.selectColumns)) : null,
          error: null,
        })
      }

      if (this.op === 'update') {
        const payload = (this.payload ?? {}) as Row
        const updated: Row[] = []
        db.tables[this.table] = rows.map((row) => {
          if (!this.filters.every((filter) => rowMatches(row, filter))) return row
          const next: Row = { ...row, ...payload }
          if (this.table !== 'kelurahan' && this.table !== 'rw' && this.table !== 'rt') next.updated_at = nowStamp()
          updated.push(next)
          return next
        })
        persistDb()
        return Promise.resolve({
          data: this.returning ? updated.map((row) => projectRow(row, this.selectColumns)) : null,
          error: null,
        })
      }

      // insert / upsert
      const rawPayload = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
      const incoming = rawPayload.filter((row) => row && typeof row === 'object').map((row) => ensureWriteDefaults(row, this.table))
      const inserted: Row[] = []

      if (this.op === 'upsert') {
        const onConflict = this.upsertOptions?.onConflict || 'id'
        const conflictColumns = onConflict.split(',').map((column) => column.trim())
        incoming.forEach((row) => {
          const index = rows.findIndex((existing) =>
            conflictColumns.every((column) => looseEquals(existing[column], row[column])))
          if (index >= 0) {
            const merged: Row = { ...rows[index], ...row, updated_at: nowStamp() }
            rows[index] = merged
            inserted.push(merged)
          } else {
            rows.push(row)
            inserted.push(row)
          }
        })
      } else {
        incoming.forEach((row) => {
          rows.push(row)
          inserted.push(row)
        })
      }

      db.tables[this.table] = rows
      persistDb()
      return Promise.resolve({
        data: this.returning ? inserted.map((row) => projectRow(row, this.selectColumns)) : null,
        error: null,
      })
    } catch (err) {
      return Promise.resolve({
        data: null,
        error: { message: err instanceof Error ? err.message : String(err), code: 'DEMO_ERROR' },
      })
    }
  }

  private applySorts(rows: Row[]): Row[] {
    if (this.sorts.length === 0) return rows
    const sorted = [...rows]
    sorted.sort((a, b) => {
      for (const sort of this.sorts) {
        const cmp = compareValues(a[sort.column], b[sort.column])
        if (cmp !== 0) return sort.ascending ? cmp : -cmp
      }
      return 0
    })
    return sorted
  }

  private applyRange(rows: Row[]): Row[] {
    if (this.rangeFrom === null || this.rangeTo === null) return rows
    return rows.slice(this.rangeFrom, this.rangeTo + 1)
  }
}

// ---------------------------------------------------------------- RPC + search
function demoRpc(name: string, args: Record<string, unknown>): Promise<DemoResult> {
  const db = loadDb()

  if (name === 'get_next_entry_number') {
    const officerId = String(args?.officer_id ?? '')
    const currentYear = new Date().getFullYear()
    const entries = db.tables.entries ?? []
    const next = entries
      .filter((entry) => String(entry.created_by ?? entry.officer_id ?? '') === officerId
        && String(entry.entry_date ?? '').slice(0, 4) === String(currentYear))
      .reduce((max, entry) => Math.max(max, Number(entry.entry_number) || 0), 0) + 1
    return Promise.resolve({ data: next, error: null })
  }

  if (name === 'search_locations') {
    const query = String(args?.p_query ?? '').trim().toLowerCase()
    const limit = Number(args?.p_limit ?? 10)
    const locations = (db.tables.locations ?? []).filter((location) => {
      if (!query) return false
      return ['name', 'code', 'address'].some((column) =>
        String(location[column] ?? '').toLowerCase().includes(query))
    })
    return Promise.resolve({ data: locations.slice(0, Number.isFinite(limit) ? limit : 10), error: null })
  }

  return Promise.resolve({
    data: null,
    error: { message: `RPC "${name}" tidak tersedia pada mode demo.`, code: 'DEMO_RPC_MISSING' },
  })
}

// ---------------------------------------------------------------- Auth (demo)
type DemoSessionUser = {
  id: string
  email: string
  user_metadata: Record<string, unknown>
  app_metadata: Record<string, unknown>
  aud: string
  created_at: string
}

type DemoSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  token_type: string
  user: DemoSessionUser
}

type AuthListener = (event: string, session: DemoSession | null) => void

const authListeners = new Set<AuthListener>()

function emitAuth(event: string, session: DemoSession | null): void {
  authListeners.forEach((listener) => {
    try {
      listener(event, session)
    } catch (err) {
      console.error('[demo] Listener auth demo gagal:', err)
    }
  })
}

function buildSession(user: DemoAuthUser): DemoSession {
  return {
    access_token: `demo-access-token.${btoa(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }))}.demo`,
    refresh_token: 'demo-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { username: user.username },
      app_metadata: { provider: 'demo' },
      aud: 'authenticated',
      created_at: user.created_at,
    },
  }
}

function findAuthUser(identifier: string): DemoAuthUser | undefined {
  const normalized = identifier.trim().toLowerCase()
  return loadDb().authUsers.find((user) =>
    user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized)
}

function validatePasswordPolicy(password: string): string | null {
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar.'
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung angka.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password harus mengandung simbol.'
  return null
}

const demoAuth = {
  async getSession(): Promise<DemoResult<{ session: DemoSession | null }>> {
    const session = readDemoSession() as unknown as DemoSession | null
    return { data: { session }, error: null }
  },

  async getUser(): Promise<DemoResult<{ user: DemoSessionUser | null }>> {
    const session = readDemoSession() as unknown as DemoSession | null
    return { data: { user: session?.user ?? null }, error: null }
  },

  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback)
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(callback),
        },
      },
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }): Promise<DemoResult<{ session: DemoSession; user: DemoSessionUser }>> {
    const user = findAuthUser(email ?? '')
    if (!user || user.password !== password) {
      return {
        data: { session: null as unknown as DemoSession, user: null as unknown as DemoSessionUser },
        error: { message: 'Email/username atau kata sandi salah (mode demo).', code: 'demo_bad_credentials' },
      }
    }
    const profile = (loadDb().tables.profiles ?? []).find((row) => String(row.id) === user.id)
    if (profile && profile.is_active === false) {
      return {
        data: { session: null as unknown as DemoSession, user: null as unknown as DemoSessionUser },
        error: { message: 'Akun demo tidak aktif.', code: 'demo_inactive' },
      }
    }
    const session = buildSession(user)
    writeDemoSession(session as unknown as Record<string, unknown>)
    setDemoActive(true)
    emitAuth('SIGNED_IN', session)
    return { data: { session, user: session.user }, error: null }
  },

  async refreshSession(): Promise<DemoResult<{ session: DemoSession | null; user: DemoSessionUser | null }>> {
    const stored = readDemoSession() as unknown as DemoSession | null
    if (!stored) return { data: { session: null, user: null }, error: null }
    const refreshed = { ...stored, expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }
    writeDemoSession(refreshed as unknown as Record<string, unknown>)
    return { data: { session: refreshed, user: refreshed.user }, error: null }
  },

  async updateUser(attributes: { password?: string }): Promise<DemoResult<{ user: DemoSessionUser | null }>> {
    const stored = readDemoSession() as unknown as DemoSession | null
    if (!stored) {
      return { data: { user: null }, error: { message: 'Tidak ada sesi demo aktif.', code: 'demo_no_session' } }
    }
    if (attributes?.password) {
      const db = loadDb()
      const target = db.authUsers.find((user) => user.id === stored.user.id)
      if (target) {
        target.password = attributes.password
        persistDb()
      }
    }
    return { data: { user: stored.user }, error: null }
  },

  async signOut(): Promise<DemoResult<null>> {
    clearDemoSession()
    setDemoActive(false)
    emitAuth('SIGNED_OUT', null)
    return { data: null, error: null }
  },
}

// ---------------------------------------------------------------- Admin users
type AdminUsersResponse = { success?: boolean; data?: Record<string, unknown>; error?: string }

async function invokeDemoFunction(name: string, body: Record<string, unknown>): Promise<DemoResult<AdminUsersResponse>> {
  if (name !== 'admin-users') {
    return {
      data: null,
      error: { message: `Fungsi "${name}" tidak tersedia pada mode demo.`, code: 'demo_function_missing' },
    }
  }

  const session = readDemoSession() as unknown as DemoSession | null
  if (!session) return { data: null, error: { message: 'Tidak terautentikasi', code: 'demo_unauthenticated' } }

  const db = loadDb()
  const callerProfile = (db.tables.profiles ?? []).find((row) => String(row.id) === session.user.id)
  if (!callerProfile || callerProfile.is_active === false) {
    return { data: null, error: { message: 'Akun tidak aktif', code: 'demo_forbidden' } }
  }
  if (callerProfile.role !== 'super_admin') {
    return { data: null, error: { message: 'Tidak memiliki akses untuk mengelola pengguna', code: 'demo_forbidden' } }
  }

  const profiles = ensureTable(db, 'profiles')
  const action = String(body?.action ?? '')

  const fail = (message: string): DemoResult<AdminUsersResponse> =>
    ({ data: { error: message } as AdminUsersResponse, error: null })

  if (action === 'create') {
    const { email, password, fullName, username, nik, phone, role, kelurahanId, rwId, rtId, rtIds, moduleAccess } = body as Record<string, unknown>
    if (!email || !fullName || !username || !nik || !phone) return fail('Data wajib belum lengkap')
    if (profiles.some((row) => String(row.nik ?? '') === String(nik))) {
      return fail('duplicate key value violates unique constraint "profiles_nik_key"')
    }
    if (profiles.some((row) => String(row.username ?? '') === String(username))) {
      return fail('duplicate key value violates unique constraint "profiles_username_key"')
    }
    const finalPassword = typeof password === 'string' && password ? password : generateDemoPassword()
    const policyError = validatePasswordPolicy(finalPassword)
    if (policyError) return fail(policyError)

    const finalRole = role === 'super_admin' || role === 'admin' || role === 'kader' ? role : 'kader'
    const id = randomId()
    const now = nowStamp()
    db.authUsers.push({ id, username: String(username), email: String(email), password: finalPassword, created_at: now })
    profiles.push({
      id,
      email: String(email),
      full_name: String(fullName),
      username: String(username),
      nik: String(nik),
      phone: String(phone),
      role: finalRole,
      kelurahan_id: (kelurahanId as string) || null,
      rw_id: (rwId as string) || null,
      rt_id: (rtId as string) || null,
      rt_ids: normalizeRtIds(rtIds, rtId),
      is_active: true,
      module_access: normalizeModuleAccess(finalRole, moduleAccess),
      is_temp_password: true,
      created_at: now,
    })
    persistDb()
    return {
      data: {
        success: true,
        data: { id, email, username, fullName, generatedPassword: finalPassword },
      },
      error: null,
    }
  }

  if (action === 'update') {
    const id = String(body?.id ?? '')
    if (!id) return fail('ID pengguna tidak ditemukan')
    const index = profiles.findIndex((row) => String(row.id) === id)
    if (index < 0) return fail('Pengguna tidak ditemukan')

    const current = profiles[index] as Row
    const updates: Row = {}
    const { fullName, username, nik, phone, role, kelurahanId, rwId, rtId, rtIds, isActive, moduleAccess, password, email } = body as Record<string, unknown>
    if (nik !== undefined && profiles.some((row) => String(row.nik ?? '') === String(nik) && String(row.id) !== id)) {
      return fail('duplicate key value violates unique constraint "profiles_nik_key"')
    }
    if (fullName !== undefined) updates.full_name = fullName
    if (username !== undefined) updates.username = username
    if (nik !== undefined) updates.nik = nik
    if (phone !== undefined) updates.phone = phone
    if (email !== undefined) updates.email = email
    if (kelurahanId !== undefined) updates.kelurahan_id = (kelurahanId as string) || null
    if (rwId !== undefined) updates.rw_id = (rwId as string) || null
    if (rtId !== undefined) updates.rt_id = (rtId as string) || null
    if (rtIds !== undefined) {
      const list = normalizeRtIds(rtIds, rtId)
      updates.rt_ids = list
      if (list && list.length > 0) updates.rt_id = list[0]
    }
    if (isActive !== undefined) updates.is_active = Boolean(isActive)
    if (role !== undefined || moduleAccess !== undefined) {
      const effectiveRole = role === 'super_admin' || role === 'admin' || role === 'kader'
        ? role
        : (current.role as string)
      updates.role = effectiveRole
      updates.module_access = normalizeModuleAccess(effectiveRole as 'super_admin' | 'admin' | 'kader', moduleAccess ?? current.module_access)
    }
    profiles[index] = { ...current, ...updates }

    if (typeof password === 'string' && password) {
      const authUser = db.authUsers.find((user) => user.id === id)
      if (authUser) authUser.password = password
    }
    persistDb()
    return { data: { success: true, data: { id } }, error: null }
  }

  if (action === 'delete') {
    const id = String(body?.id ?? '')
    if (!id) return fail('ID pengguna tidak ditemukan')
    if (id === DEMO_USER_ID || id === session.user.id) {
      return fail('Tidak dapat menghapus akun demo/akun sendiri.')
    }
    db.tables.profiles = profiles.filter((row) => String(row.id) !== id)
    db.authUsers = db.authUsers.filter((user) => user.id !== id)
    persistDb()
    return { data: { success: true, data: { id } }, error: null }
  }

  return fail(`Aksi "${action}" tidak dikenal pada mode demo.`)
}

function normalizeRtIds(rtIds: unknown, rtId?: unknown): string[] | null {
  if (Array.isArray(rtIds)) {
    const list = rtIds.map((value) => String(value ?? '')).filter((value) => value !== '')
    return list.length > 0 ? list : null
  }
  return rtId ? [String(rtId)] : null
}

function normalizeModuleAccess(role: 'super_admin' | 'admin' | 'kader', value: unknown): Record<string, boolean> {
  const source = value && typeof value === 'object' ? (value as Record<string, boolean>) : {}
  const keys = ['entry', 'wilayah', 'pengguna', 'lokasi', 'uji_air', 'uji_udara', 'pangan', 'group_tpp']
  const access: Record<string, boolean> = {}
  keys.forEach((key) => { access[key] = source[key] === true })
  if (role === 'super_admin') keys.forEach((key) => { access[key] = true })
  else if (role === 'admin') access.pengguna = false
  else return { entry: true, wilayah: false, pengguna: false, lokasi: false, uji_air: false, uji_udara: false, pangan: false, group_tpp: false }
  return access
}

function generateDemoPassword(): string {
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
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// ---------------------------------------------------------------- Storage demo
type DemoFileRecord = { dataUrl?: string; blobUrl?: string; name: string; type: string; size: number }

const memoryFiles = new Map<string, DemoFileRecord>()

function readFilesMap(): Record<string, DemoFileRecord> {
  const raw = demoSafeGet(DEMO_FILES_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, DemoFileRecord>
  } catch {
    return {}
  }
}

function writeFilesMap(map: Record<string, DemoFileRecord>): void {
  demoSafeSet(DEMO_FILES_KEY, JSON.stringify(map))
}

function fileToDataUrl(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    } catch {
      resolve(null)
    }
  })
}

const demoStorage = {
  from(bucket: string) {
    return {
      async upload(path: string, file: Blob, options?: { upsert?: boolean; contentType?: string }): Promise<DemoResult<{ path: string }>> {
        const record: DemoFileRecord = {
          name: file instanceof File ? file.name : path,
          type: options?.contentType || file.type || 'application/octet-stream',
          size: file.size,
        }
        // Simpan sebagai data-URL bila masih muat; jika tidak, cukup blob URL
        // sementara (hilang setelah halaman dimuat ulang).
        if (file.size <= 700_000) {
          const dataUrl = await fileToDataUrl(file)
          if (dataUrl) record.dataUrl = dataUrl
        }
        try {
          record.blobUrl = URL.createObjectURL(file)
        } catch {
          // URL.createObjectURL tidak tersedia — abaikan.
        }
        memoryFiles.set(`${bucket}/${path}`, record)
        if (record.dataUrl) {
          const map = readFilesMap()
          map[`${bucket}/${path}`] = { ...record, blobUrl: undefined }
          writeFilesMap(map)
        }
        return { data: { path }, error: null }
      },

      getPublicUrl(path: string): DemoResult<{ publicUrl: string }> {
        const record = memoryFiles.get(`${bucket}/${path}`) ?? readFilesMap()[`${bucket}/${path}`]
        const publicUrl = record?.blobUrl || record?.dataUrl || ''
        return { data: { publicUrl }, error: null }
      },

      async remove(paths: string[]): Promise<DemoResult<null>> {
        const map = readFilesMap()
        paths.forEach((path) => {
          memoryFiles.delete(`${bucket}/${path}`)
          delete map[`${bucket}/${path}`]
        })
        writeFilesMap(map)
        return { data: null, error: null }
      },
    }
  },
}

// ---------------------------------------------------------------- Client demo
export type DemoClient = {
  from(table: string): DemoQueryBuilder
  rpc(name: string, args?: Record<string, unknown>): Promise<DemoResult>
  auth: typeof demoAuth
  functions: { invoke(name: string, options?: { body?: Record<string, unknown>; headers?: Record<string, string> }): Promise<DemoResult<AdminUsersResponse>> }
  storage: typeof demoStorage
}

let client: DemoClient | null = null

export function getDemoClient(): DemoClient {
  if (client) return client
  client = {
    from: (table: string) => new DemoQueryBuilder(table),
    rpc: (name: string, args?: Record<string, unknown>) => demoRpc(name, args ?? {}),
    auth: demoAuth,
    functions: {
      invoke: (name: string, options?: { body?: Record<string, unknown> }) => invokeDemoFunction(name, options?.body ?? {}),
    },
    storage: demoStorage,
  }
  return client
}

// Mode demo selalu bisa dipakai; kredensialnya dibuat oleh pemilik aplikasi.
export const DEMO_LOGIN_AVAILABLE = Boolean(DEMO_USERNAME && DEMO_PASSWORD && DEMO_EMAIL && DEMO_USER_ID)
