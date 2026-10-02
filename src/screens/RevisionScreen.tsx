import { useState } from 'react'
import { api } from '../api.ts'
import { useAction, useLoad } from '../lib/hooks.ts'
import { duplicateTarget, groupReviewRecords } from '../lib/revision.ts'
import type { Catalogo, ConversoDetalle, ConversoResumen } from '../types.ts'

export function RevisionScreen({ catalogo, onOpen, onChanged }: { catalogo: Catalogo; onOpen: (id: string) => void; onChanged: () => void }) {
  const queue = useLoad(() => api<ConversoResumen[]>('conversos.list', { revisar: true }), 'revision-queue')
  const [corrections, setCorrections] = useState<Record<string, { maestroId?: string; fechaShahada?: string; nacionalidad?: string }>>({})
  const [compare, setCompare] = useState<Record<string, [ConversoDetalle, ConversoDetalle] | null>>({})
  const [newNationality, setNewNationality] = useState<Record<string, string>>({})
  const action = useAction()
  if (queue.error) return <p className="alert">{queue.error}</p>
  if (!queue.data) return <p className="muted">Cargando…</p>
  const groups = groupReviewRecords(queue.data.map((r) => ({ ...r, revisar: r.motivosRevision || '' })))
  const setCorrection = (id: string, patch: { maestroId?: string; fechaShahada?: string; nacionalidad?: string }) => setCorrections((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  return (
    <div className="stack">
      <h1>Revisión de registros</h1>
      <p className="muted">Los cambios usan las acciones existentes. Al marcar un registro como revisado se limpian todos sus motivos de revisión.</p>
      {!queue.data.length && <p className="card">No hay registros pendientes de revisión.</p>}
      {groups.map(({ reason, records }) => <section className="card stack" key={reason}>
        <h2>{reason}</h2>
        {records.map((record) => {
          const duplicateId = duplicateTarget(reason)
          const correction = corrections[record.id] || {}
          const other = compare[record.id]
          return <article className="stack tight" key={record.id}>
            <button className="rowlink" onClick={() => onOpen(record.id)}><strong>{record.nombre}</strong><span className="muted">{record.id} · {record.nacionalidad || 'Sin nacionalidad'} · {record.maestroNombre || 'Sin sheij'}</span></button>
            {reason.toLowerCase().includes('sheij') && <label className="stack">Corregir sheij<select value={correction.maestroId ?? record.maestroId} onChange={(e) => setCorrection(record.id, { maestroId: e.target.value })}><option value="">Sin sheij</option>{catalogo.maestros.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.active ? '' : ' (inactivo)'}</option>)}</select></label>}
            {reason.toLowerCase().includes('fecha') && <label className="stack">Corregir fecha de shahada<input type="date" value={correction.fechaShahada ?? ''} onChange={(e) => setCorrection(record.id, { fechaShahada: e.target.value })} /></label>}
            {reason.toLowerCase().includes('nacionalidad') && <div className="stack"><label className="stack">Corregir nacionalidad<select value={correction.nacionalidad ?? record.nacionalidad ?? ''} onChange={(e) => setCorrection(record.id, { nacionalidad: e.target.value })}><option value="">Elegir…</option>{catalogo.nacionalidades.map((n) => <option key={n.id} value={n.nombre}>{n.nombre}{n.active ? '' : ' (inactiva)'}</option>)}</select></label><form className="row" onSubmit={(e) => { e.preventDefault(); action.run(async () => { const name = newNationality[record.id]?.trim(); if (!name) return; await api('nacionalidades.save', { nombre: name, orden: catalogo.nacionalidades.length }); setCorrection(record.id, { nacionalidad: name }); setNewNationality((prev) => ({ ...prev, [record.id]: '' })); onChanged() }) }}><input aria-label="Agregar nacionalidad" placeholder="Otra nacionalidad" value={newNationality[record.id] || ''} onChange={(e) => setNewNationality((prev) => ({ ...prev, [record.id]: e.target.value }))} /><button className="small">Agregar a la lista</button></form></div>}
            {duplicateId && <div className="stack tight"><button className="small" onClick={() => action.run(async () => { const [current, duplicate] = await Promise.all([api<ConversoDetalle>('conversos.get', { id: record.id }), api<ConversoDetalle>('conversos.get', { id: duplicateId })]); setCompare((prev) => ({ ...prev, [record.id]: [current, duplicate] })) })}>Comparar datos del registro</button>{other && <div className="compare">{other.map((detail) => <div className="card stack tight" key={detail.converso.id}><strong>{detail.converso.nombre}</strong><span>{detail.converso.id}</span><span>{detail.converso.nacionalidad || 'Sin nacionalidad'} · {detail.converso.maestroNombre || 'Sin sheij'}</span><span>Fecha de shahada: {detail.converso.fechaShahada || '—'}</span><button className="small" onClick={() => onOpen(detail.converso.id)}>Abrir registro</button></div>)}</div>}<button className="small" onClick={() => action.run(async () => { await api('conversos.revisado', { id: record.id }); queue.reload() })}>No es duplicado</button></div>}
            <div className="row"><button className="small" onClick={() => onOpen(record.id)}>Abrir registro</button><button className="small primary" disabled={action.busy} onClick={() => action.run(async () => { const data = Object.fromEntries(Object.entries(correction).filter(([, value]) => value !== undefined && value !== '')); if (Object.keys(data).length) await api('conversos.update', { id: record.id, data }); await api('conversos.revisado', { id: record.id }); queue.reload() })}>Guardar correcciones y marcar revisado</button></div>
          </article>
        })}
      </section>)}
      {action.error && <p className="alert">{action.error}</p>}
    </div>
  )
}
