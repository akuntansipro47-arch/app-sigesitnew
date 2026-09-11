// Supabase Edge Function: admin-users
// Handles account creation/update/deletion using the service role key.
// Only super_admin callers may manage accounts or module permissions.
import { createClient } from 'jsr:@supabase/supabase-js@2'

type AppRole = 'super_admin' | 'admin' | 'kader'
type ModuleAccess = {
  entry: boolean
  wilayah: boolean
  pengguna: boolean
  lokasi: boolean
  uji_air: boolean
  uji_udara: boolean
  pangan: boolean
  group_tpp: boolean
}

function normalizeRole(role: unknown): AppRole {
  return role === 'super_admin' || role === 'admin' || role === 'kader' ? role : 'kader'
}

function normalizeModuleAccess(role: AppRole, value: unknown): ModuleAccess {
  const source = value && typeof value === 'object' ? value as Partial<ModuleAccess> : {}
  const access: ModuleAccess = {
    entry: source.entry === true,
    wilayah: source.wilayah === true,
    pengguna: source.pengguna === true,
    lokasi: source.lokasi === true,
    uji_air: source.uji_air === true,
    uji_udara: source.uji_udara === true,
    pangan: source.pangan === true,
    group_tpp: source.group_tpp === true,
  }

  if (role === 'super_admin') {
    return Object.fromEntries(Object.entries(access).map(([key]) => [key, true])) as ModuleAccess
  }
  if (role === 'admin') return { ...access, pengguna: false }
  return { entry: true, wilayah: false, pengguna: false, lokasi: false, uji_air: false, uji_udara: false, pangan: false, group_tpp: false }
}

function validatePassword(password: string): string | null {
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar.'
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.'
  if (!/[0-9]/.test(password)) return 'Password harus mengandung angka.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password harus mengandung simbol.'
  return null
}

function generateRandomPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const all = upper + lower + numbers + symbols
  let password = ''
  password += upper[Math.floor(Math.random() * upper.length)]
  password += lower[Math.floor(Math.random() * lower.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return json({ error: 'Tidak terautentikasi' }, 401)

     const admin = createClient(supabaseUrl, serviceRoleKey)
     const { data: callerProfile } = await admin.from('profiles').select('role, is_active, module_access').eq('id', user.id).single()
     if (!callerProfile || !callerProfile.is_active) {
       return json({ error: 'Akun tidak aktif' }, 403)
     }
     const canManageUsers = callerProfile.role === 'super_admin'
     if (!canManageUsers) {
       return json({ error: 'Tidak memiliki akses untuk mengelola pengguna' }, 403)
     }

    const body = await req.json()
    const action = body.action as string

    if (action === 'create') {
      const { email, password, fullName, username, nik, phone, role, kelurahanId, rwId, rtId, moduleAccess } = body
      if (!email || !fullName || !username || !nik || !phone) {
        return json({ error: 'Data wajib belum lengkap' }, 400)
      }
      const { data: existingNik } = await admin.from('profiles').select('id').eq('nik', nik).maybeSingle()
      if (existingNik) {
        return json({ error: 'duplicate key value violates unique constraint "profiles_nik_key"' }, 400)
      }
      const finalPassword = password || generateRandomPassword()
      const passwordError = validatePassword(finalPassword)
      if (passwordError) return json({ error: passwordError }, 400)
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password: finalPassword, email_confirm: true,
      })
      if (createError || !created.user) return json({ error: createError?.message ?? 'Gagal membuat akun' }, 400)

      const finalRole = normalizeRole(role)
      const { error: profileError } = await admin.from('profiles').insert({
        id: created.user.id,
        email, full_name: fullName, username, nik, phone,
        role: finalRole,
        kelurahan_id: kelurahanId || null, rw_id: rwId || null, rt_id: rtId || null,
        module_access: normalizeModuleAccess(finalRole, moduleAccess),
        is_temp_password: true,
      })
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: profileError.message }, 400)
      }
      return json({
        success: true,
        data: {
          id: created.user.id,
          email,
          username,
          fullName,
          generatedPassword: finalPassword,
        }
      })
    }

    if (action === 'update') {
      const { id, fullName, username, nik, phone, role, kelurahanId, rwId, rtId, isActive, moduleAccess, password, email } = body
      if (!id) return json({ error: 'ID pengguna tidak ditemukan' }, 400)

      if (nik !== undefined) {
        const { data: existingNik } = await admin.from('profiles').select('id').eq('nik', nik).neq('id', id).maybeSingle()
        if (existingNik) {
          return json({ error: 'duplicate key value violates unique constraint "profiles_nik_key"' }, 400)
        }
      }

      const updates: Record<string, unknown> = {}
      if (fullName !== undefined) updates.full_name = fullName
      if (username !== undefined) updates.username = username
      if (nik !== undefined) updates.nik = nik
      if (phone !== undefined) updates.phone = phone
      if (role !== undefined) updates.role = normalizeRole(role)
      if (kelurahanId !== undefined) updates.kelurahan_id = kelurahanId || null
      if (rwId !== undefined) updates.rw_id = rwId || null
      if (rtId !== undefined) updates.rt_id = rtId || null
      if (isActive !== undefined) updates.is_active = isActive
      if (moduleAccess !== undefined) updates.module_access = moduleAccess
      if (email !== undefined) updates.email = email

      if (Object.keys(updates).length) {
        const { error } = await admin.from('profiles').update(updates).eq('id', id)
        if (error) return json({ error: error.message }, 400)
      }

      if (password || email) {
        const authUpdate: Record<string, unknown> = {}
        if (password) {
          const passwordError = validatePassword(password)
          if (passwordError) return json({ error: passwordError }, 400)
          authUpdate.password = password
        }
        if (email) authUpdate.email = email
        const { error } = await admin.auth.admin.updateUserById(id, authUpdate)
        if (error) return json({ error: error.message }, 400)
        
        // Reset temp password flag when password is changed
        if (password) {
          await admin.from('profiles').update({ is_temp_password: false }).eq('id', id)
        }
      }
      return json({ success: true })
    }

    if (action === 'delete') {
      const { id } = body
      if (!id) return json({ error: 'ID pengguna tidak ditemukan' }, 400)
      if (id === user.id) return json({ error: 'Tidak dapat menghapus akun sendiri' }, 400)
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Aksi tidak dikenali' }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Terjadi kesalahan' }, 500)
  }
})
