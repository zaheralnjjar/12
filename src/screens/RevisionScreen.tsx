import { useState } from 'react'
import { api } from '../api.ts'
import { useAction, useLoad } from '../lib/hooks.ts'
import { duplicateTarget, groupReviewRecords, reviewCorrectionFields, reviewReasons } from '../lib/revision.ts'
import type { Catalogo, ConversoDetalle, ConversoResumen } from '../types.ts'
import { T, useLocale } from '../lib/i18n.tsx'

type ReviewApiRecord = ConversoResumen & { motivosRevision?: string }
type ReviewRecord = Omit<ConversoResumen, 'revisar'> & { motivosRevision?: string; revisar: string }

export function RevisionScreen({ catalogo, onOpen, onChanged }: { catalogo: Catalogo; onOpen: (id: string) => void; onChanged: () => void }) {
  const queue = useLoad(() => api<ReviewApiRecord[]>('conversos.list', { revisar: true }), 'revision-queue')
  if (queue.error) return <p className="alert"><T>{queue.error}</T></p>
  if (!queue.data) return <p className="muted"><T>Cargando…</T></p>
  const records = queue.data.map((record) => ({ ...record, revisar: record.motivosRevision || '' }))
  const groups = groupReviewRecords(records)
  return (
    <div className="stack">
      <h1><T>Revisión de registros</T></h1>
      <p className="muted"><T>Cada motivo se resuelve por separado. Los demás motivos del registro permanecen pendientes.</T></p>
      {!records.length && <p className="card"><T>No hay registros pendientes de revisión.</T></p>}
      {groups.map(({ reason, records: grouped }) => <section className="card stack" key={reason}>
        <h2><T>{reason}</T></h2>
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
      <span className="muted">{record.id} <T> <T> · </T></T>{record.nacionalidad || 'Sin nacionalidad'} <T> <T> · </T></T>{record.maestroNombre || 'Sin sheij'}</span>
    </button>
    <ul className="stack tight">{reviewReasons(record.revisar).map((reason) => <li className="stack tight" key={reason}>
      <strong><T>{reason}</T></strong>
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
  const { t } = useLocale()
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
    })}><T>Comparar registros</T></button>
    {comparison && <div className="compare">{comparison.map((detail) => <div className="card stack tight" key={detail.converso.id}>
      <strong>{detail.converso.nombre}</strong><span>{detail.converso.id}</span>
      <span>{detail.converso.nacionalidad || 'Sin nacionalidad'} <T> · </T>{detail.converso.maestroNombre || 'Sin sheij'}</span>
      <span><T>Fecha de shahada: </T><T>{detail.converso.fechaShahada || '—'}</T></span>
      <button className="small" onClick={() => onOpen(detail.converso.id)}><T>Abrir registro</T></button>
    </div>)}</div>}
    {comparison && <button className="small" disabled={action.busy} onClick={() => resolve()}><T>No es duplicado</T></button>}
    {action.error && <p className="alert"><T>{action.error}</T></p>}
  </div>

  if (!fields.length) return <p className="muted small"><T>Este motivo no tiene una corrección rápida. Permanece pendiente hasta revisarlo.</T></p>

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
    }}><input aria-label={t('Agregar nacionalidad')} placeholder={t('Otra nacionalidad')} value={newNationality} onChange={(event) => setNewNationality(event.target.value)} /><button className="small" disabled={action.busy}><T>Agregar a la lista</T></button></form>}
    <button className="small primary" disabled={action.busy || fields.some((field) => !values[field]?.trim())} onClick={() => resolve(values)}><T>Guardar y resolver este motivo</T></button>
    {action.error && <p className="alert"><T>{action.error}</T></p>}
  </div>
}

function CorrectionField({ field, values, change, record, catalogo }: {
  field: string
  values: Record<string, string>
  change: (key: string, value: string) => void
  record: ReviewRecord
  catalogo: Catalogo
}) {
  if (field === 'maestroId') return <label className="stack"><T>Corregir sheij</T><select value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)}><option value=""><T>Elegir…</T></option>{catalogo.maestros.filter((maestro) => maestro.active).map((maestro) => <option key={maestro.id} value={maestro.id}>{maestro.nombre}</option>)}</select></label>
  if (field === 'fechaShahada' || field === 'fechaNacimiento') return <label className="stack">{field === 'fechaShahada' ? 'Corregir fecha de shahada' : 'Corregir fecha de nacimiento'}<input type="date" value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'nacionalidad') return <label className="stack"><T>Corregir nacionalidad</T><select value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)}><option value=""><T>Elegir…</T></option>{catalogo.nacionalidades.filter((item) => item.active).map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}</select></label>
  if (field === 'whatsapp') return <label className="stack"><T>Corregir WhatsApp</T><input type="tel" inputMode="tel" value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'codigoPais') return <label className="stack"><T>Código de país</T><input inputMode="numeric" value={values[field] ?? '54'} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'tipoDocumento') return <label className="stack"><T>Tipo de documento</T><select value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)}><option value=""><T>Elegir…</T></option><option><T>DNI</T></option><option><T>Pasaporte</T></option><option><T>Otro</T></option></select></label>
  if (field === 'numeroDocumento') return <label className="stack"><T>Número de documento</T><input value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  if (field === 'edadAlRegistro') return <label className="stack"><T>Edad al registrarse</T><input type="number" min="0" max="130" value={values[field] ?? ''} onChange={(event) => change(field, event.target.value)} /></label>
  return <span className="muted">{record.id}</span>
}
