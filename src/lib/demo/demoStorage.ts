// ==================== MODE DEMO SIGESIT ====================
// Akun demo (user: demo / password: demo123) memakai DATA DUMMY, bukan data
// asli pengguna. Semua data yang dibaca maupun disimpan oleh akun demo
// berada sepenuhnya di PERANGKAT USER (localStorage / "history cache device"),
// tidak pernah menyentuh database Supabase yang utama.

export const DEMO_USERNAME = 'demo'
export const DEMO_PASSWORD = 'demo123'
export const DEMO_EMAIL = 'demo@sigesit.local'
export const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111'

// Naikkan angka ini bila isi data dummy ingin di-reset otomatis di semua perangkat.
export const DEMO_SEED_VERSION = 2

const DEMO_FLAG_KEY = 'sigesit.demo.mode'
const DEMO_SESSION_KEY = 'sigesit.demo.session'
export const DEMO_DB_KEY = 'sigesit.demo.db'
export const DEMO_FILES_KEY = 'sigesit.demo.files'

type AnyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function getStorage(): AnyStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function demoSafeGet(key: string): string | null {
  return getStorage()?.getItem(key) ?? null
}

export function demoSafeSet(key: string, value: string): boolean {
  try {
    getStorage()?.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function demoSafeRemove(key: string): void {
  try {
    getStorage()?.removeItem(key)
  } catch {
    // localStorage tidak tersedia (private mode/penuh) — abaikan.
  }
}

/** True bila sesi/sesi demo sedang aktif di perangkat ini. */
export function isDemoActive(): boolean {
  return demoSafeGet(DEMO_FLAG_KEY) === '1'
}

export function setDemoActive(active: boolean): void {
  if (active) demoSafeSet(DEMO_FLAG_KEY, '1')
  else demoSafeRemove(DEMO_FLAG_KEY)
}

export type StoredDemoSession = Record<string, unknown> | null

export function readDemoSession(): StoredDemoSession {
  const raw = demoSafeGet(DEMO_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredDemoSession
  } catch {
    return null
  }
}

export function writeDemoSession(session: StoredDemoSession): void {
  if (!session) {
    demoSafeRemove(DEMO_SESSION_KEY)
    return
  }
  demoSafeSet(DEMO_SESSION_KEY, JSON.stringify(session))
}

export function clearDemoSession(): void {
  demoSafeRemove(DEMO_SESSION_KEY)
}

/**
 * Cocokkan kredensial login dengan akun demo.
 * Field "Email" pada form login boleh diisi `demo`, `demo@sigesit.local`,
 * atau email lain yang terdaftar di data dummy akun demo.
 */
export function matchesDemoCredential(identifier: string, password: string): boolean {
  const normalized = identifier.trim().toLowerCase()
  return (
    password === DEMO_PASSWORD &&
    (normalized === DEMO_USERNAME || normalized === DEMO_EMAIL)
  )
}

/** Hapus SEMUA data demo (sesi + cache data) dari perangkat ini. */
export function resetDemoDeviceData(): void {
  demoSafeRemove(DEMO_DB_KEY)
  demoSafeRemove(DEMO_FILES_KEY)
  demoSafeRemove(DEMO_SESSION_KEY)
  setDemoActive(false)
}
