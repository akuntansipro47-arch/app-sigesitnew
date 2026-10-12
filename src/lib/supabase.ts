import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getDemoClient } from './demo/demoEngine'
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  isDemoActive,
  matchesDemoCredential,
  resetDemoDeviceData,
} from './demo/demoStorage'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log configuration for debugging
console.log('Supabase Configuration:', {
  url: url ? 'SET' : 'NOT SET',
  anonKey: anonKey ? 'SET' : 'NOT SET',
  configured: !!(url && anonKey)
})

const realClient: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null

export const supabaseConfigured = realClient !== null

type AnyRecord = Record<string, any>
type AuthCallback = (event: string, session: unknown) => void

const demo = (): AnyRecord => getDemoClient() as unknown as AnyRecord
const real = (): AnyRecord | null => realClient as unknown as AnyRecord | null

// ==================== AUTH: perpindahan real <-> demo ====================
// Method auth dibungkus terpisah karena pergantian ke mode demo terjadi di
// tengah sesi: login "demo/demo123" harus langsung mengaktifkan mesin lokal,
// dan logout dari demo harus mematikannya lagi.

function isDemoIdentifier(identifier: string): boolean {
  return matchesDemoCredential(identifier, DEMO_PASSWORD) || identifier.trim().toLowerCase() === DEMO_EMAIL
}

function createAuthNamespace(): AnyRecord {
  return new Proxy({} as AnyRecord, {
    get(_target, property) {
      const key = String(property)

      if (key === 'signInWithPassword') {
        return async (credentials: { email?: string; password?: string }) => {
          // Selama mode demo aktif, semua login diarahkan ke mesin demo;
          // saat tidak aktif, hanya kredensial demo yang memicu mesin demo.
          const useDemo = isDemoActive()
            || (isDemoIdentifier(credentials?.email ?? '') && credentials?.password === DEMO_PASSWORD)
          if (useDemo) return demo().auth.signInWithPassword(credentials as never)
          const client = real()
          if (!client) {
            return {
              data: { session: null, user: null },
              error: { message: 'Supabase belum dikonfigurasi.', status: 503 },
            }
          }
          return (client.auth as { signInWithPassword: (c: unknown) => Promise<unknown> }).signInWithPassword(credentials)
        }
      }

      if (key === 'onAuthStateChange') {
        return (callback: AuthCallback) => {
          const subscriptions: Array<{ data: { subscription: { unsubscribe: () => void } } }> = []
          const client = real()
          if (client) {
            // Perubahan sesi asli diabaikan selama mode demo aktif agar data
            // dummy tidak tercampur dengan akun asli.
            subscriptions.push((client.auth as { onAuthStateChange: (cb: AuthCallback) => never }).onAuthStateChange((event, session) => {
              if (isDemoActive()) return
              callback(event, session)
            }) as never)
          }
          // Event demo selalu diteruskan: hanya terjadi saat mode demo dipakai.
          subscriptions.push(demo().auth.onAuthStateChange(callback) as never)
          return {
            data: {
              subscription: {
                unsubscribe: () => subscriptions.forEach((item) => item.data.subscription.unsubscribe()),
              },
            },
          }
        }
      }

      if (key === 'signOut') {
        return async (options?: unknown) => {
          if (isDemoActive()) return demo().auth.signOut()
          const client = real()
          if (!client) return { data: null, error: null }
          return (client.auth as { signOut: (o?: unknown) => Promise<unknown> }).signOut(options)
        }
      }

      // Method lain (getSession/getUser/updateUser/refreshSession/…) mengikuti
      // mode yang sedang aktif.
      const client = isDemoActive() ? demo() : real()
      if (!client) return undefined
      const namespace = client.auth as AnyRecord
      const value = Reflect.get(namespace, property, namespace) as unknown
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(namespace)
      }
      return value
    },
  })
}

function wrapNamespace(namespace: AnyRecord): AnyRecord {
  return new Proxy(namespace, {
    get(target, property) {
      const value = Reflect.get(target, property, target) as unknown
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(target)
      }
      return value
    },
  })
}

// ==================== DISPATCHER ====================
// Satu objek "supabase" untuk seluruh aplikasi; setiap pemanggilan memilih
// mesin yang tepat: mode demo (localStorage perangkat, data dummy) atau
// Supabase asli (database utama).

const dispatcher = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (property === 'auth') return createAuthNamespace()

    const client = isDemoActive() ? demo() : real()
    if (!client) return undefined

    const value = Reflect.get(client, property, client) as unknown
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(client)
    }
    if (value && typeof value === 'object') {
      // Namespace seperti .storage / .functions — bungkus agar method di
      // dalamnya tetap terpanggil dengan receiver yang benar.
      return wrapNamespace(value as AnyRecord)
    }
    return value
  },
})

export const supabase: SupabaseClient | null = realClient ? dispatcher : null

// ==================== API MODE DEMO ====================

/** True bila pengguna sedang masuk lewat akun demo (data dummy, cache perangkat). */
export function isDemoSessionActive(): boolean {
  return isDemoActive()
}

/**
 * Hapus semua data demo dari perangkat (cache data + sesi demo) lalu keluar
 * dari mode demo. Data utama di database tidak tersentuh oleh proses ini.
 */
export function clearDemoDeviceCache(): void {
  resetDemoDeviceData()
}

// Test connection on initialization (hanya klien asli — mode demo sepenuhnya lokal)
if (realClient) {
  console.log('Supabase client initialized successfully')
  realClient.auth.getSession().then(({ data, error }) => {
    console.log('Initial session check:', { session: !!data.session, error: error?.message })
  })
} else {
  console.warn('Supabase client not initialized - check environment variables')
}
