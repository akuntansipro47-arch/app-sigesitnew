// Supabase Edge Function: admin-users
// Handles account creation/update/deletion using the service role key.
// Only callers whose profile has role = 'super_admin' and is_active = true may proceed.
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
    const { data: callerProfile } = await admin.from('profiles').select('role, is_active').eq('id', user.id).single()
    if (!callerProfile || callerProfile.role !== 'super_admin' || !callerProfile.is_active) {
      return json({ error: 'Hanya super admin yang dapat mengelola pengguna' }, 403)
    }

    const body = await req.json()
    const action = body.action as string

    if (action === 'create') {
      const { email, password, fullName, username, nik, phone, role, kelurahanId, rwId, rtId, moduleAccess } = body
      if (!email || !password || !fullName || !username || !nik || !phone) {
        return json({ error: 'Data wajib belum lengkap' }, 400)
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      })
      if (createError || !created.user) return json({ error: createError?.message ?? 'Gagal membuat akun' }, 400)

      const { error: profileError } = await admin.from('profiles').insert({
        id: created.user.id,
        email, full_name: fullName, username, nik, phone,
        role: role === 'super_admin' ? 'super_admin' : 'kader',
        kelurahan_id: kelurahanId || null, rw_id: rwId || null, rt_id: rtId || null,
        module_access: moduleAccess || { entry: true, wilayah: true, pengguna: false },
      })
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id)
        return json({ error: profileError.message }, 400)
      }
      return json({ id: created.user.id })
    }

    if (action === 'update') {
      const { id, fullName, username, nik, phone, role, kelurahanId, rwId, rtId, isActive, password, email } = body
      if (!id) return json({ error: 'ID pengguna tidak ditemukan' }, 400)

      const updates: Record<string, unknown> = {}
      if (fullName !== undefined) updates.full_name = fullName
      if (username !== undefined) updates.username = username
      if (nik !== undefined) updates.nik = nik
      if (phone !== undefined) updates.phone = phone
      if (role !== undefined) updates.role = role === 'super_admin' ? 'super_admin' : 'kader'
      if (kelurahanId !== undefined) updates.kelurahan_id = kelurahanId || null
      if (rwId !== undefined) updates.rw_id = rwId || null
      if (rtId !== undefined) updates.rt_id = rtId || null
      if (isActive !== undefined) updates.is_active = isActive
      if (email !== undefined) updates.email = email

      if (Object.keys(updates).length) {
        const { error } = await admin.from('profiles').update(updates).eq('id', id)
        if (error) return json({ error: error.message }, 400)
      }

      if (password || email) {
        const authUpdate: Record<string, unknown> = {}
        if (password) authUpdate.password = password
        if (email) authUpdate.email = email
        const { error } = await admin.auth.admin.updateUserById(id, authUpdate)
        if (error) return json({ error: error.message }, 400)
      }
      return json({ ok: true })
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
