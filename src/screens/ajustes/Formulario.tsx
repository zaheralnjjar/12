// Importing the Google form's responses. The form's sheet is only read, never changed.
import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { fecha } from '../../lib/labels.ts'
import { T } from '../../lib/i18n.tsx'

type Status = { configured: boolean; sheetId: string; tab: string; lastRunAt: string; lastSummary: Partial<Summary> }
type Summary = { leidas: number; yaVistas: number; importadas: number; duplicadas: number; errores: number; aRevisar: number; pendientes: number; columnasSinUsar: string[] }
type Item = { fila: number; fecha: string; nombre: string; status: string; detalle: string; conversoId: string }
type Pass = { summary: Summary; items: Item[] }

const STATUS: Record<string, [string, string]> = {
  importado: ['Importada', 'badge good'],
  duplicado: ['Repetida', 'badge warn'],
  error: ['Error', 'badge bad'],
}

function SummaryView({ p, dry, onOpen }: { p: Pass; dry: boolean; onOpen: (id: string) => void }) {
  const s = p.summary
  return (
    <div className="card stack">
      <h2>{dry ? 'Vista previa (no se guardó nada)' : 'Resultado'}</h2>
      <p>{s.leidas} <T> <T> filas en la hoja · </T></T>{s.yaVistas} <T> <T> ya importadas antes · </T></T><strong>{s.importadas} {dry ? 'por importar' : 'importadas'}</strong> <T> <T> (</T></T>{s.aRevisar} <T> <T> a revisar) · </T></T>{s.duplicadas} <T> <T> repetidas · </T></T>{s.errores} <T> <T> con error</T></T>{s.pendientes ? ` · ${s.pendientes} quedan para la próxima vez` : ''}</p>
      {s.columnasSinUsar.length > 0 && <p className="note small"><T>Columnas que no se usan: </T>{s.columnasSinUsar.join(', ')}<T>. Si querés guardarlas, creá un campo propio con el mismo título.</T></p>}
      {p.items.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead><tr><th><T>Fila</T></th><th><T>Fecha</T></th><th><T>Nombre</T></th><th><T>Estado</T></th><th><T>Detalle</T></th></tr></thead>
            <tbody>
              {p.items.map((i) => (
                <tr key={i.fila}>
                  <td>{i.fila}</td><td>{fecha(i.fecha)}</td>
                  <td>{i.conversoId && !dry ? <button className="ghost small" onClick={() => onOpen(i.conversoId)}>{i.nombre}</button> : i.nombre}</td>
                  <td><span className={STATUS[i.status]?.[1]}><T>{STATUS[i.status]?.[0] ?? i.status}</T></span></td>
                  <td className="small">{i.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function Formulario({ onOpen }: { onOpen: (id: string) => void }) {
  const st = useLoad(() => api<Status>('formSync.status'), 'formsync')
  const [source, setSource] = useState('')
  const [tab, setTab] = useState('')
  const [result, setResult] = useState<{ p: Pass; dry: boolean } | null>(null)
  const action = useAction()
  if (st.error) return <p className="alert"><T>{st.error}</T></p>
  if (!st.data) return <p className="muted"><T>Cargando…</T></p>
  const s = st.data
  return (
    <div className="stack">
      <h1><T>Formulario de Google</T></h1>
      <p className="muted small"><T>La aplicación lee la hoja de respuestas del formulario «Nuevo musulmán» y crea un registro por cada respuesta nueva. Nunca escribe en esa hoja. Cada respuesta se importa una sola vez; las dudosas (fecha, teléfono, sheij o nacionalidad no reconocidos) quedan marcadas «a revisar».</T></p>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('formSync.setSource', { source, tab: tab || s.tab }); setSource(''); st.reload(); return 'Hoja vinculada' }) }}>
        <h2><T>Hoja de respuestas</T></h2>
        <p className="small">{s.configured ? <><T>Vinculada: </T><span dir="ltr">{s.sheetId}</span> <T> <T> · pestaña «</T></T>{s.tab}<T>»</T></> : 'Todavía no hay una hoja vinculada.'}</p>
        <label className="stack"><span><T>Enlace de la hoja de respuestas</T></span><input dir="ltr" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></label>
        <label className="stack"><span><T>Nombre de la pestaña</T></span><input value={tab} onChange={(e) => setTab(e.target.value)} placeholder={s.tab} /></label>
        <span className="help"><T>La cuenta dueña de la aplicación tiene que poder abrir esa hoja.</T></span>
        <button disabled={action.busy || !source}><T>Vincular</T></button>
      </form>
      {s.configured && (
        <div className="card stack">
          <h2><T>Importar</T></h2>
          {s.lastRunAt && <p className="muted small"><T>Última importación: </T>{fecha(s.lastRunAt)}{s.lastSummary.importadas !== undefined ? ` · ${s.lastSummary.importadas} importadas` : ''}</p>}
          <div className="row">
            <button disabled={action.busy} onClick={() => action.run(async () => setResult({ p: await api<Pass>('formSync.preview'), dry: true }))}><T>Vista previa</T></button>
            <button className="primary" disabled={action.busy} onClick={() => action.run(async () => { setResult({ p: await api<Pass>('formSync.run'), dry: false }); st.reload() })}><T>Importar respuestas nuevas</T></button>
            <button disabled={action.busy} onClick={() => action.run(async () => { const r = await api<{ asignados: number; sinReconocer: number }>('formSync.rematch'); return `Sheij asignados: ${r.asignados}. Sin reconocer todavía: ${r.sinReconocer}.` })}><T>Volver a reconocer sheij</T></button>
            <button disabled={action.busy} onClick={() => action.run(async () => { const r = await api<{ updated: { nacionalidad: number; maestro: number }; choices: { nacionalidades: number; maestros: number } }>('formSync.updateChoices'); return `Listas actualizadas: nacionalidades (${r.choices.nacionalidades}) y sheij (${r.choices.maestros}). Preguntas modificadas: ${r.updated.nacionalidad + r.updated.maestro}.` })}><T>Actualizar listas del formulario</T></button>
          </div>
          <span className="help"><T>«Volver a reconocer sheij»: después de agregar otras formas de escribir un nombre en «Sheij / maestros», asigna los registros que quedaron sin sheij.</T></span>
        </div>
      )}
      {action.busy && <p className="muted"><T>Procesando…</T></p>}
      {action.error && <p className="alert"><T>{action.error}</T></p>}
      {action.done && <p className="ok"><T>{action.done}</T></p>}
      {result && <SummaryView p={result.p} dry={result.dry} onOpen={onOpen} />}
    </div>
  )
}
