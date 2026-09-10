import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Language, TranslationKeys } from '../i18n'
import { translations } from '../i18n'

type TranslationContextValue = {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationKeys
}

export const TranslationContext = createContext<TranslationContextValue>({
  language: 'id',
  setLanguage: () => {},
  t: translations.id,
})

export function useTranslation(): TranslationContextValue {
  return useContext(TranslationContext)
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('id')
  const t = translations[language]

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  )
}
