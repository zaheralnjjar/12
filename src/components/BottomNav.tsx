import { NavIcon, type NavIconName } from './NavIcon.tsx'
import type { Role } from '../types.ts'
import { T } from '../lib/i18n.tsx'
import { useLocale } from '../lib/locale-context.ts'

export type Tab = 'home' | 'conversos' | 'nuevo' | 'enlaces' | 'ajustes' | 'perfil' | 'pendientes'

const TABS: Record<'supervisor' | 'maestro', { id: Tab; icon: NavIconName; label: string }[]> = {
  supervisor: [
    { id: 'home', icon: 'home', label: 'Inicio' },
    { id: 'conversos', icon: 'people', label: 'Registros' },
    { id: 'nuevo', icon: 'plus', label: 'Nuevo' },
    { id: 'enlaces', icon: 'link', label: 'Enlaces' },
    { id: 'pendientes', icon: 'pending', label: 'Pendientes' },
    { id: 'ajustes', icon: 'settings', label: 'Ajustes' },
  ],
  maestro: [
    { id: 'home', icon: 'home', label: 'Inicio' },
    { id: 'conversos', icon: 'people', label: 'Mis registros' },
    { id: 'nuevo', icon: 'plus', label: 'Nuevo' },
    { id: 'enlaces', icon: 'link', label: 'Enlaces' },
    { id: 'pendientes', icon: 'pending', label: 'Pendientes' },
    { id: 'perfil', icon: 'user', label: 'Perfil' },
  ],
}

export function BottomNav({ role, active, onGo }: { role: Role; active: Tab | null; onGo: (t: Tab) => void }) {
  const { t } = useLocale()
  if (role === 'colaborador') return null
  return (
    <nav className="tabs" aria-label={t('Navegación')}>
      {TABS[role].map((t) => (
        <button key={t.id} className={active === t.id ? 'on' : ''} onClick={() => onGo(t.id)} aria-current={active === t.id ? 'page' : undefined}>
          <NavIcon name={t.icon} />
          <span><T>{t.label}</T></span>
        </button>
      ))}
    </nav>
  )
}
