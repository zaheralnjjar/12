import { useState } from 'react'
import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { ESTADO_LABEL, fecha } from '../lib/labels.ts'
import type { Catalogo, ConversoResumen, Role } from '../types.ts'
import { T } from '../lib/i18n.tsx'
import { useLocale } from '../lib/locale-context.ts'

export type Filtro = {
  estado?: string
  maestroId?: string
  nacionalidad?: string
  revisar?: boolean
  sinMaestro?: boolean
  sexo?: string
  edadMin?: number
  edadMax?: number
  desde?: string
  hasta?: string
}

type Periodo = '' | 'mes-anterior' | 'ano-anterior' | 'personalizado'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function previousMonthRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  return { desde: dateKey(start), hasta: dateKey(end) }
}

function previousYearRange(now = new Date()) {
  const year = now.getFullYear() - 1
  return { desde: `${year}-01-01`, hasta: `${year}-12-31` }
}

export function ConversosScreen({ role, catalogo, filtro, onOpen }: {
  role: Role
  catalogo: Catalogo
  filtro?: Filtro
  onOpen: (id: string) => void
}) {
  const { t } = useLocale()
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [f, setF] = useState<Filtro>(filtro ?? {})
  const [periodo, setPeriodo] = useState<Periodo>('')
  const list = useLoad(() => api<ConversoResumen[]>('conversos.list', { q: query, ...f }), JSON.stringify([query, f]))
  const set = (patch: Filtro) => setF({ ...f, ...patch })
  const setDateFilter = (patch: Pick<Filtro, 'desde' | 'hasta'>) => {
    setPeriodo('personalizado')
    set(patch)
  }
  const choosePeriod = (value: Periodo) => {
    setPeriodo(value)
    if (value === 'mes-anterior') set(previousMonthRange())
    else if (value === 'ano-anterior') set(previousYearRange())
    else set({ desde: undefined, hasta: undefined })
  }

  return (
    <div className="stack">
      <h1><T>{role === 'maestro' ? 'Mis registros' : 'Registros'}</T></h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()) }}>
        <input className="grow" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Buscar por nombre, N.º de registro, documento o WhatsApp')} aria-label={t('Buscar')} style={{ width: 'auto' }} />
        <button className="primary"><T>Buscar</T></button>
      </form>
      <div className="row filters-primary">
        <select aria-label={t('Estado')} value={f.estado ?? ''} onChange={(e) => set({ estado: e.target.value || undefined })} style={{ width: 'auto' }}>
          <option value=""><T>Todos menos archivados</T></option>
          {Object.entries(ESTADO_LABEL).map(([k, l]) => <option key={k} value={k}><T>{l}</T></option>)}
        </select>
        {role === 'supervisor' && (
          <select aria-label={t('Sheij')} value={f.sinMaestro ? '-' : f.maestroId ?? ''} onChange={(e) => set(e.target.value === '-' ? { sinMaestro: true, maestroId: undefined } : { maestroId: e.target.value || undefined, sinMaestro: undefined })} style={{ width: 'auto' }}>
            <option value=""><T>Todos los sheij</T></option>
            <option value="-"><T>Sin sheij asignado</T></option>
            {catalogo.maestros.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.active ? '' : ' (inactivo)'}</option>)}
          </select>
        )}
        <select aria-label={t('Nacionalidad')} value={f.nacionalidad ?? ''} onChange={(e) => set({ nacionalidad: e.target.value || undefined })} style={{ width: 'auto' }}>
          <option value=""><T>Todas las nacionalidades</T></option>
          {catalogo.nacionalidades.map((n) => <option key={n.id} value={n.nombre}>{n.nombre}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={!!f.revisar} onChange={(e) => set({ revisar: e.target.checked || undefined })} /><span><T>Solo a revisar</T></span></label>
      </div>
      <div className="filter-grid" role="group" aria-label={t('Filtros por edad, sexo y fecha')}>
        <select aria-label={t('Sexo')} value={f.sexo ?? ''} onChange={(e) => set({ sexo: e.target.value || undefined })}>
          <option value=""><T>Todos los sexos</T></option>
          <option value="M"><T>Masculino</T></option>
          <option value="F"><T>Femenino</T></option>
        </select>
        <label className="stack filter-age">
          <span><T>Edad mínima</T></span>
          <input type="number" min="0" max="120" inputMode="numeric" aria-label={t('Edad mínima')} value={f.edadMin ?? ''} onChange={(e) => set({ edadMin: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <label className="stack filter-age">
          <span><T>Edad máxima</T></span>
          <input type="number" min="0" max="120" inputMode="numeric" aria-label={t('Edad máxima')} value={f.edadMax ?? ''} onChange={(e) => set({ edadMax: e.target.value ? Number(e.target.value) : undefined })} />
        </label>
        <select aria-label={t('Período de registro')} value={periodo} onChange={(e) => choosePeriod(e.target.value as Periodo)}>
          <option value=""><T>Cualquier período</T></option>
          <option value="mes-anterior"><T>Mes pasado</T></option>
          <option value="ano-anterior"><T>Año pasado</T></option>
          <option value="personalizado"><T>Período personalizado</T></option>
        </select>
        {periodo === 'personalizado' && (
          <>
            <label className="stack filter-date"><span><T>Desde</T></span><input type="date" aria-label={t('Desde')} value={f.desde ?? ''} onChange={(e) => setDateFilter({ desde: e.target.value || undefined })} /></label>
            <label className="stack filter-date"><span><T>Hasta</T></span><input type="date" aria-label={t('Hasta')} value={f.hasta ?? ''} onChange={(e) => setDateFilter({ hasta: e.target.value || undefined })} /></label>
          </>
        )}
      </div>
      {list.error && <p className="alert"><T>{list.error}</T></p>}
      {!list.data ? <p className="muted"><T>Cargando…</T></p> : (
        <>
          <p className="muted small">{list.data.length} <T>{list.data.length === 1 ? 'registro' : 'registros'}</T></p>
          <ul className="list">
            {list.data.map((c) => (
              <li key={c.id}>
                <button className="rowlink card" onClick={() => onOpen(c.id)}>
                  <span className="main">
                    <strong>{c.nombre}{c.nombreIslamico ? ` · ${c.nombreIslamico}` : ''}</strong>
                    <span className="muted small">
                      {c.id}{c.ciudad ? ` · ${c.ciudad}` : ''}{c.nacionalidad ? ` · ${c.nacionalidad}` : ''}
                      <T>{role === 'supervisor' ? ` · ${c.maestroNombre || 'sin sheij'}` : ''}</T>
                    </span>
                    {c.ultimoSeguimiento && <span className="muted small"><T>Último seguimiento: </T>{fecha(c.ultimoSeguimiento)}</span>}
                  </span>
                  <span className="stack tight" style={{ alignItems: 'flex-end' }}>
                    {c.estado !== 'activo' && <span className="badge dim"><T>{ESTADO_LABEL[c.estado]}</T></span>}
                    {c.revisar && <span className="badge warn"><T>A revisar</T></span>}
                    {c.proximaFecha && <span className="badge good">{fecha(c.proximaFecha)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {list.data.length === 0 && <p className="muted"><T>No hay registros con estos filtros.</T></p>}
        </>
      )}
    </div>
  )
}
