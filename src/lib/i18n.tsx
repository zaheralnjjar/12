import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getLanguage, setLanguage, translatedText, translate, type Language } from './locale.ts'

const LanguageContext = createContext<{ language: Language; changeLanguage: (language: Language) => void }>({
  language: 'es',
  changeLanguage: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [language, setCurrentLanguage] = useState<Language>(getLanguage)
  const changeLanguage = useCallback((next: Language) => {
    setLanguage(next)
    setCurrentLanguage(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language === 'ar' ? 'ar' : 'es-AR'
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  return <LanguageContext.Provider value={{ language, changeLanguage }}>{children}</LanguageContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useLocale() {
  const { language, changeLanguage } = useContext(LanguageContext)
  return {
    language,
    changeLanguage,
    t: (key: string) => translate(key, language),
  }
}

function translateNode(node: ReactNode, language: Language): ReactNode {
  if (typeof node === 'string') return translatedText(node, language)
  if (Array.isArray(node)) return node.map((part, index) => <T key={index}>{part}</T>)
  return node
}

export function T({ children }: { children: ReactNode }) {
  return <LanguageContext.Consumer>{({ language }) => <>{translateNode(children, language)}</>}</LanguageContext.Consumer>
}

export function LanguageSwitcher() {
  const { language, changeLanguage } = useLocale()
  const next: Language = language === 'es' ? 'ar' : 'es'
  const label = next === 'ar' ? 'العربية' : 'Español'
  return <button className="language-switch" type="button" lang={next} dir={next === 'ar' ? 'rtl' : 'ltr'} aria-label={language === 'es' ? 'Cambiar idioma a árabe' : 'تغيير اللغة إلى الإسبانية'} onClick={() => changeLanguage(next)}>{label}</button>
}
