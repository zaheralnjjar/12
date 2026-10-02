import { useState } from 'react'
import { api } from '../api.ts'
import { useAction, useLoad } from '../lib/hooks.ts'
import { duplicateTarget, groupReviewRecords, reviewCorrectionFields, reviewReasons } from '../lib/revision.ts'
import type { Catalogo, ConversoDetalle, ConversoResumen } from '../types.ts'

type ReviewApiRecord = ConversoResumen & { motivosRevision?: string }
type ReviewRecord = Omit<ConversoResumen, 'revisar'> & { motivosRevision?: string; revisar: string }

export function RevisionScreen({ catalogo, onOpen, onChanged }: { catalogo: Catalogo; onOpen: (id: string) => void; onChanged: () => void }) {
  const queue = useLoad(() => api<ReviewApiRecord[]>('conversos.list', { revisar: true }), 'revision-queue')
  if (queue.error) return <p className="alert">{queue.error}</p>
  if (!queue.data) return <p className="muted">Cargando…</p>
  const records = queue.data.map((record) => ({ ...record, revisar: record.motivosRevision || '' }))
  const groups = groupReviewRecords(records)
  return (
    <div className="stack">
      <h1>Revisión de registros</h1>
      <p className="muted">Cada motivo se resuelve por separado. Los demás motivos del registro permanecen pendientes.</p>
      {!records.length && <p className="card">No hay registros pendientes de revisión.</p>}
      {groups.map(({ reason, records: grouped }) => <section className="card stack" key={reason}>
        <h2>{reason}</h2>
        {grouped.map((record) => <ReviewCard key={record.id} record={record} catalogo={catalogo} onOpen={onOpen} onResolved={queue.reload} onChanged={onChanged} />)}
      </section>)}
    </div>
  )
}

function ReviewCard({ record, catalogo, onOpen, onResolved, onChanged }: {
  record: ReviewRecord & { revisar: string }
  catalogo: Catalogo
  onOpen: (id: string) => void
  onResolved: () => void
  onChanged: () => void
}) {
  return <article className="card stack tight">
    <button className="rowlink" onClick={() => onOpen(record.id)}>
      <strong>{record.nombre}</strong>
      <span className="muted">{record.id} · {record.nacionalidad || 'Sin nacionalidad'} · {record.maestroNombre || 'Sin sheij'}</span>
    </button>
    <ul className="stack tight">{reviewReasons(record.revisar).map((reason) => <li className="stack tight" key={reason}>
      <strong>{reason}</strong>
      <ReasonCorrection reason={reason} record={record} catalogo={catalogo} onOpen={onOpen} onResolved={onResolved} onChanged={onChanged} />
    </li>)}</ul>
  </article>
}

function ReasonCorrection({ reason, record, catalogo, onOpen, onResolved, onChanged }: {
  reason: string
  record: ReviewRecord
  catalogo: Catalogo
  onOpen: (id: string) => void
  onResolved: () => void
  onChanged: () => void
}) {
  const fields = reviewCorrectionFields(reason)
  const [values, setValues] = useState<Record<string, string>>({ codigoPais: '54' })
  const [newNationality, setNewNationality] = useState('')
  const [comparison, setComparison] = useState<[ConversoDetalle, ConversoDetalle] | null>(null)
  const action = useAction()
  const targetId = duplicateTarget(reason)
  const change = (key: string, value: string) => setValues((previous) => ({ ...previous, [key]: value }))

  const resolve = (data: Record<string, string> = {}) => action.run(async () => {
    if (fields.length && fields.some((field) => !data[field]?.trim())) return
    if (Object.keys(data).length) await api('conversos.update', { id: record.id, data })
    await api('conversos.revisado', { id: record.id, motivos: [reason] })
    onResolved()
  })

  if (targetId) return <div className="stack tight">
    <button className="small" disabled={action.busy} onClick={() => action.run(async () => {
      const pair = await Promise.all([api<ConversoDetalle>('conversos.get', { id: record.id }), api<ConversoDetalle>('conversos.get', { id: targetId })])
      setComparison(pair)
    })}>Comparar registros</button>
    {comparison && <div className="compare">{comparison.map((detail) => <div className="card stack tight" key={detail.converso.id}>
      <strong>{detail.converso.nombre}</strong><span>{detail.converso.id}</span>
      <span>{detail.converso.nacionalidad || 'Sin nacionalidad'} · {detail.converso.maestroNombre || 'Sin sheij'}</span>
      <span>Fecha de shahada: {detail.converso.fechaShahada || '—'}</span>
      <button className="small" onClick={() => onOpen(detail.converso.id)}>Abrir registro</button>
    </div>)}</div>}
    {comparison && <button className="small" disabled={action.busy} onClick={() => resolve()}>No es duplicado</button>}
    {action.error && <p className="alert">{action.error}</p>}
  </div>

  if (!fields.length) return <p className="muted small">Este motivo no tiene una corrección rápida. Permanece pendiente hasta revisarlo.</p>

  return <div className="stack tight">
    {fields.map((field) => <CorrectionField key={field} field={field} values={values} change={change} record={record} catalogo={catalogo} />)}
    {fields.includes('nacionalidad') && <form className="row" onSubmit={(event) => {
      event.preventDefault()
      action.run(async () => {
        const name = newNationality.trim()
        if (!name) return
        await api('nacionalidades.save', { nombre: name, orden: catalogo.nacionalidades.length })
        change('nacionalidad', name)
        setNewNationality('')
        onChanged()
      })
    }}><input aria-label="Agregar nacionalidad" placeholder="Otra nacionalidad" value={newNationality} onChange={(event) => setNewNationality(event.target.value)} /><button className="small" disabled={action.busy}>Agregar a la lista</button></form>}
    <button className="small primary" disabled={action.busy || fields.some((field) => !values[field]?.trim())} onClick={() => resolve(values)}>Guardar y resolver este motivo</button>
    {action.error && <p className="alert">{action.error}</p>}
  </div>
}

function CorrectionField({ field, values, change, record, catalogo }: {
  field: string
  values: Record<string, string>
  change: (key: string, value: string) => void
  record: ReviewRecord
  catalogo: Catalogo
}) {
  if (field === 'maestroId') return <label className="stack">Corregir sheij<select value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)}><option value="">Elegir…</option>{catalogo.maestros.filter((maestro) => maestro.active).map((maestro) => <option key={maestro.id} value={maestro.id}>{maestro.nombre}</option>)}</select></label>
  if (field === 'fechaShahada' || field === 'fechaNacimiento') return <label className="stack">{field === 'fechaShahada' ? 'Corregir fecha de shahada' : 'Corregir fecha de nacimiento'}<input type="date" value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'nacionalidad') return <label className="stack">Corregir nacionalidad<select value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)}><option value="">Elegir…</option>{catalogo.nacionalidades.filter((item) => item.active).map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}</select></label>
  if (field === 'whatsapp') return <label className="stack">Corregir WhatsApp<input type="tel" inputMode="tel" value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'codigoPais') return <label className="stack">Código de país<input inputMode="numeric" value={values[field] ?? '54'} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'tipoDocumento') return <label className="stack">Tipo de documento<select value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)}><option value="">Elegir…</option><option>DNI</option><option>Pasaporte</option><option>Otro</option></select></label>
  if (field === 'numeroDocumento') return <label className="stack">Número de documento<input value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'edadAlRegistro') return <label className="stack">Edad al registrarse<input type="number" min="0" max="130" value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  return <span className="muted">{record.id}</span>
}
