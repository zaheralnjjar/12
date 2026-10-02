import { createContext, useContext } from 'react'
import { translate, type Language } from './locale.ts'

export const LanguageContext = createContext<{ language: Language; changeLanguage: (language: Language) => void }>({
  language: 'es',
  changeLanguage: () => {},
})

export function useLocale() {
  const { language, changeLanguage } = useContext(LanguageContext)
  return {
    language,
    changeLanguage,
    t: (key: string) => translate(key, language),
  }
}
