import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getLanguage, setLanguage, translatedText, type Language } from './locale.ts'
import { LanguageContext, useLocale } from './locale-context.ts'

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
  return (
    <button className="language-switch" type="button" lang={next} dir={next === 'ar' ? 'rtl' : 'ltr'} aria-label={language === 'es' ? 'Cambiar idioma a árabe' : 'تغيير اللغة إلى الإسبانية'} title={language === 'es' ? 'Cambiar idioma a árabe' : 'تغيير اللغة إلى الإسبانية'} onClick={() => changeLanguage(next)}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        <path d="M8.3 8.8h2.1m-1.05-1v4.4m3.25 1.9 1.6-4.3 1.6 4.3m-2.7-1h2.2" />
      </svg>
    </button>
  )
}
