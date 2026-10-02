import { useState } from 'react'
import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { ESTADO_LABEL, fecha } from '../lib/labels.ts'
import type { Catalogo, ConversoResumen, Role } from '../types.ts'

export type Filtro = { estado?: string; maestroId?: string; nacionalidad?: string; revisar?: boolean; sinMaestro?: boolean }

export function ConversosScreen({ role, catalogo, filtro, onOpen }: {
  role: Role
  catalogo: Catalogo
  filtro?: Filtro
  onOpen: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [f, setF] = useState<Filtro>(filtro ?? {})
  const list = useLoad(() => api<ConversoResumen[]>('conversos.list', { q: query, ...f }), JSON.stringify([query, f]))
  const set = (patch: Filtro) => setF({ ...f, ...patch })

  return (
    <div className="stack">
      <h1>{role === 'maestro' ? 'Mis registros' : 'Registros'}</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()) }}>
        <input className="grow" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, N.º de registro, documento o WhatsApp" aria-label="Buscar" style={{ width: 'auto' }} />
        <button className="primary">Buscar</button>
      </form>
      <div className="row">
        <select aria-label="Estado" value={f.estado ?? ''} onChange={(e) => set({ estado: e.target.value || undefined })} style={{ width: 'auto' }}>
          <option value="">Todos menos archivados</option>
          {Object.entries(ESTADO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {role === 'supervisor' && (
          <select aria-label="Sheij" value={f.sinMaestro ? '-' : f.maestroId ?? ''} onChange={(e) => set(e.target.value === '-' ? { sinMaestro: true, maestroId: undefined } : { maestroId: e.target.value || undefined, sinMaestro: undefined })} style={{ width: 'auto' }}>
            <option value="">Todos los sheij</option>
            <option value="-">Sin sheij asignado</option>
            {catalogo.maestros.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.active ? '' : ' (inactivo)'}</option>)}
          </select>
        )}
        <select aria-label="Nacionalidad" value={f.nacionalidad ?? ''} onChange={(e) => set({ nacionalidad: e.target.value || undefined })} style={{ width: 'auto' }}>
          <option value="">Todas las nacionalidades</option>
          {catalogo.nacionalidades.map((n) => <option key={n.id} value={n.nombre}>{n.nombre}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={!!f.revisar} onChange={(e) => set({ revisar: e.target.checked || undefined })} /><span>Solo a revisar</span></label>
      </div>
      {list.error && <p className="alert">{list.error}</p>}
      {!list.data ? <p className="muted">Cargando…</p> : (
        <>
          <p className="muted small">{list.data.length} {list.data.length === 1 ? 'registro' : 'registros'}</p>
          <ul className="list">
            {list.data.map((c) => (
              <li key={c.id}>
                <button className="rowlink card" onClick={() => onOpen(c.id)}>
                  <span className="main">
                    <strong>{c.nombre}{c.nombreIslamico ? ` · ${c.nombreIslamico}` : ''}</strong>
                    <span className="muted small">
                      {c.id}{c.ciudad ? ` · ${c.ciudad}` : ''}{c.nacionalidad ? ` · ${c.nacionalidad}` : ''}
                      {role === 'supervisor' ? ` · ${c.maestroNombre || 'sin sheij'}` : ''}
                    </span>
                    {c.ultimoSeguimiento && <span className="muted small">Último seguimiento: {fecha(c.ultimoSeguimiento)}</span>}
                  </span>
                  <span className="stack tight" style={{ alignItems: 'flex-end' }}>
                    {c.estado !== 'activo' && <span className="badge dim">{ESTADO_LABEL[c.estado]}</span>}
                    {c.revisar && <span className="badge warn">A revisar</span>}
                    {c.proximaFecha && <span className="badge good">{fecha(c.proximaFecha)}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {list.data.length === 0 && <p className="muted">No hay registros con estos filtros.</p>}
        </>
      )}
    </div>
  )
}
