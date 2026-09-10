export type Language = 'id' | 'en' | 'su'

export type ThemeId = 'default' | 'elegantBlue' | 'metallicGray' | 'softGold' | 'glossyBlack' | 'cleanWhite'

export type ThemeColors = {
  bg: string
  surface: string
  surfaceAlt: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  borderStrong: string
  primary: string
  primaryLight: string
  primaryBg: string
  primaryHover: string
  danger: string
  dangerBg: string
  dangerHover: string
  success: string
  successBg: string
  warning: string
  warningBg: string
  info: string
  infoBg: string
}

export type Theme = {
  id: ThemeId
  name: string
  colors: ThemeColors
}

export const themes: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceAlt: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      primary: '#6d28d9',
      primaryLight: '#8b5cf6',
      primaryBg: '#ede9fe',
      primaryHover: '#5b21b6',
      danger: '#dc2626',
      dangerBg: '#fee2e2',
      dangerHover: '#b91c1c',
      success: '#16a34a',
      successBg: '#dcfce7',
      warning: '#d97706',
      warningBg: '#fef3c7',
      info: '#2563eb',
      infoBg: '#dbeafe',
    }
  },
  {
    id: 'elegantBlue',
    name: 'Elegant Blue',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceAlt: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      primary: '#1e40af',
      primaryLight: '#3b82f6',
      primaryBg: '#dbeafe',
      primaryHover: '#1e3a8a',
      danger: '#dc2626',
      dangerBg: '#fee2e2',
      dangerHover: '#b91c1c',
      success: '#16a34a',
      successBg: '#dcfce7',
      warning: '#d97706',
      warningBg: '#fef3c7',
      info: '#2563eb',
      infoBg: '#dbeafe',
    }
  },
  {
    id: 'metallicGray',
    name: 'Metallic Gray',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      surfaceAlt: '#f1f5f9',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      primary: '#475569',
      primaryLight: '#64748b',
      primaryBg: '#f1f5f9',
      primaryHover: '#334155',
      danger: '#dc2626',
      dangerBg: '#fee2e2',
      dangerHover: '#b91c1c',
      success: '#16a34a',
      successBg: '#dcfce7',
      warning: '#d97706',
      warningBg: '#fef3c7',
      info: '#2563eb',
      infoBg: '#dbeafe',
    }
  },
  {
    id: 'softGold',
    name: 'Soft Gold',
    colors: {
      bg: '#fefce8',
      surface: '#ffffff',
      surfaceAlt: '#fef9c3',
      text: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#78716c',
      border: '#fde68a',
      borderStrong: '#fcd34d',
      primary: '#92400e',
      primaryLight: '#b45309',
      primaryBg: '#fef3c7',
      primaryHover: '#78350f',
      danger: '#dc2626',
      dangerBg: '#fee2e2',
      dangerHover: '#b91c1c',
      success: '#16a34a',
      successBg: '#dcfce7',
      warning: '#d97706',
      warningBg: '#fef3c7',
      info: '#2563eb',
      infoBg: '#dbeafe',
    }
  },
  {
    id: 'glossyBlack',
    name: 'Glossy Black',
    colors: {
      bg: '#0f172a',
      surface: '#1e293b',
      surfaceAlt: '#334155',
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      border: '#334155',
      borderStrong: '#475569',
      primary: '#818cf8',
      primaryLight: '#a5b4fc',
      primaryBg: '#312e81',
      primaryHover: '#6366f1',
      danger: '#f87171',
      dangerBg: '#450a0a',
      dangerHover: '#ef4444',
      success: '#4ade80',
      successBg: '#052e16',
      warning: '#fbbf24',
      warningBg: '#422006',
      info: '#60a5fa',
      infoBg: '#172554',
    }
  },
  {
    id: 'cleanWhite',
    name: 'Clean White',
    colors: {
      bg: '#ffffff',
      surface: '#ffffff',
      surfaceAlt: '#f8fafc',
      text: '#0f172a',
      textSecondary: '#475569',
      textMuted: '#64748b',
      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      primary: '#0f172a',
      primaryLight: '#334155',
      primaryBg: '#f1f5f9',
      primaryHover: '#020617',
      danger: '#dc2626',
      dangerBg: '#fee2e2',
      dangerHover: '#b91c1c',
      success: '#16a34a',
      successBg: '#dcfce7',
      warning: '#d97706',
      warningBg: '#fef3c7',
      info: '#2563eb',
      infoBg: '#dbeafe',
    }
  }
]

export const themesJson = JSON.parse(JSON.stringify(themes)) as Theme[]

export type AppSettings = {
  theme: ThemeId
  fontFamily: string
  language: Language
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'default',
  fontFamily: 'Inter',
  language: 'id',
}

const STORAGE_KEY = 'sigesit-app-settings'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function getThemeById(id: ThemeId): Theme {
  return themes.find(t => t.id === id) ?? themes[0]
}
