import type { UserProfile, UserRole, ModuleAccess } from '../types'

export type { UserRole, ModuleAccess } from '../types'

export const MODULES: ReadonlyArray<{ key: keyof ModuleAccess; label: string; icon: string }> = [
  { key: 'entry', label: 'Entry Data', icon: '👨‍👩‍👧‍👦' },
  { key: 'wilayah', label: 'Wilayah', icon: '⌘' },
  { key: 'pengguna', label: 'Pengguna', icon: '♙' },
  { key: 'lokasi', label: 'Lokasi', icon: '📍' },
  { key: 'uji_air', label: 'Uji Air', icon: '💧' },
  { key: 'uji_udara', label: 'Uji Udara', icon: '🌬️' },
  { key: 'pangan', label: 'Pangan', icon: '🍱' },
  { key: 'group_tpp', label: 'Group TPP', icon: '📋' },
]

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  kader: 'Kader',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full akses ke semua modul dan fitur tanpa batasan.',
  admin: 'Akses penuh ke modul yang diberikan (select akses).',
  kader: 'Akses terbatas hanya ke modul Data Entry, data hanya milik sendiri.',
}

const ROLE_HIERARCHY: readonly UserRole[] = ['kader', 'admin', 'super_admin']

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role)
}

export function isSuperAdmin(profile: UserProfile | null | undefined): boolean {
  return profile?.role === 'super_admin'
}

export function isAdmin(profile: UserProfile | null | undefined): boolean {
  return profile?.role === 'admin' || profile?.role === 'super_admin'
}

export function isKader(profile: UserProfile | null | undefined): boolean {
  return profile?.role === 'kader'
}

export function canAccessModule(
  profile: UserProfile | null | undefined,
  module: keyof ModuleAccess,
): boolean {
  if (!profile) return false
  if (profile.role === 'super_admin') return true
  if (profile.role === 'kader') return module === 'entry'
  return profile.moduleAccess[module] === true
}

const ALWAYS_ACCESSIBLE_VIEWS = new Set([
  'beranda',
  'profile',
  'profil_pengguna',
  'pengaturan',
  'unauthorized',
])

const VIEW_TO_MODULE: Record<string, keyof ModuleAccess> = {
  entry: 'entry',
  wilayah: 'wilayah',
  pengguna: 'pengguna',
  lokasi: 'lokasi',
  uji_air: 'uji_air',
  uji_udara: 'uji_udara',
  pangan: 'pangan',
  group_tpp: 'group_tpp',
}

export function canAccessView(
  profile: UserProfile | null | undefined,
  viewName: string,
): boolean {
  if (!profile) return false
  if (profile.role === 'super_admin') return true
  if (ALWAYS_ACCESSIBLE_VIEWS.has(viewName)) return true
  const moduleKey = VIEW_TO_MODULE[viewName]
  if (moduleKey) return canAccessModule(profile, moduleKey)
  return false
}

export function canManageUsers(
  profile: UserProfile | null | undefined,
): boolean {
  return isSuperAdmin(profile)
}

export function canManageData(
  profile: UserProfile | null | undefined,
  module: keyof ModuleAccess,
): boolean {
  return canAccessModule(profile, module)
}

export function getDefaultModuleAccess(role: UserRole): ModuleAccess {
  switch (role) {
    case 'super_admin':
      return {
        entry: true,
        wilayah: true,
        pengguna: true,
        lokasi: true,
        uji_air: true,
        uji_udara: true,
        pangan: true,
        group_tpp: true,
      }
    case 'admin':
      return {
        entry: false,
        wilayah: false,
        pengguna: false,
        lokasi: false,
        uji_air: false,
        uji_udara: false,
        pangan: false,
        group_tpp: false,
      }
    case 'kader':
      return {
        entry: true,
        wilayah: false,
        pengguna: false,
        lokasi: false,
        uji_air: false,
        uji_udara: false,
        pangan: false,
        group_tpp: false,
      }
  }
}

export function getKaderDataFilter(
  userId: string,
): { column: string; value: string } {
  return { column: 'created_by', value: userId }
}

export function isKaderDataOwner(
  profile: UserProfile | null | undefined,
  createdBy: string | undefined,
): boolean {
  if (!profile || profile.role !== 'kader') return false
  return profile.id === createdBy
}
