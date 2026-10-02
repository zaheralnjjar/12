// Importing the Google form's responses. The form's sheet is only read, never changed.
import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { fecha } from '../../lib/labels.ts'

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
      <p>{s.leidas} filas en la hoja · {s.yaVistas} ya importadas antes · <strong>{s.importadas} {dry ? 'por importar' : 'importadas'}</strong> ({s.aRevisar} a revisar) · {s.duplicadas} repetidas · {s.errores} con error{s.pendientes ? ` · ${s.pendientes} quedan para la próxima vez` : ''}</p>
      {s.columnasSinUsar.length > 0 && <p className="note small">Columnas que no se usan: {s.columnasSinUsar.join(', ')}. Si querés guardarlas, creá un campo propio con el mismo título.</p>}
      {p.items.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Fila</th><th>Fecha</th><th>Nombre</th><th>Estado</th><th>Detalle</th></tr></thead>
            <tbody>
              {p.items.map((i) => (
                <tr key={i.fila}>
                  <td>{i.fila}</td><td>{fecha(i.fecha)}</td>
                  <td>{i.conversoId && !dry ? <button className="ghost small" onClick={() => onOpen(i.conversoId)}>{i.nombre}</button> : i.nombre}</td>
                  <td><span className={STATUS[i.status]?.[1]}>{STATUS[i.status]?.[0] ?? i.status}</span></td>
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
  if (st.error) return <p className="alert">{st.error}</p>
  if (!st.data) return <p className="muted">Cargando…</p>
  const s = st.data
  return (
    <div className="stack">
      <h1>Formulario de Google</h1>
      <p className="muted small">La aplicación lee la hoja de respuestas del formulario «Nuevo musulmán» y crea un registro por cada respuesta nueva. Nunca escribe en esa hoja. Cada respuesta se importa una sola vez; las dudosas (fecha, teléfono, sheij o nacionalidad no reconocidos) quedan marcadas «a revisar».</p>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('formSync.setSource', { source, tab: tab || s.tab }); setSource(''); st.reload(); return 'Hoja vinculada' }) }}>
        <h2>Hoja de respuestas</h2>
        <p className="small">{s.configured ? <>Vinculada: <span dir="ltr">{s.sheetId}</span> · pestaña «{s.tab}»</> : 'Todavía no hay una hoja vinculada.'}</p>
        <label className="stack"><span>Enlace de la hoja de respuestas</span><input dir="ltr" value={source} onChange={(e) => setSource(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/…" /></label>
        <label className="stack"><span>Nombre de la pestaña</span><input value={tab} onChange={(e) => setTab(e.target.value)} placeholder={s.tab} /></label>
        <span className="help">La cuenta dueña de la aplicación tiene que poder abrir esa hoja.</span>
        <button disabled={action.busy || !source}>Vincular</button>
      </form>
      {s.configured && (
        <div className="card stack">
          <h2>Importar</h2>
          {s.lastRunAt && <p className="muted small">Última importación: {fecha(s.lastRunAt)}{s.lastSummary.importadas !== undefined ? ` · ${s.lastSummary.importadas} importadas` : ''}</p>}
          <div className="row">
            <button disabled={action.busy} onClick={() => action.run(async () => setResult({ p: await api<Pass>('formSync.preview'), dry: true }))}>Vista previa</button>
            <button className="primary" disabled={action.busy} onClick={() => action.run(async () => { setResult({ p: await api<Pass>('formSync.run'), dry: false }); st.reload() })}>Importar respuestas nuevas</button>
            <button disabled={action.busy} onClick={() => action.run(async () => { const r = await api<{ asignados: number; sinReconocer: number }>('formSync.rematch'); return `Sheij asignados: ${r.asignados}. Sin reconocer todavía: ${r.sinReconocer}.` })}>Volver a reconocer sheij</button>
          </div>
          <span className="help">«Volver a reconocer sheij»: después de agregar otras formas de escribir un nombre en «Sheij / maestros», asigna los registros que quedaron sin sheij.</span>
        </div>
      )}
      {action.busy && <p className="muted">Procesando…</p>}
      {action.error && <p className="alert">{action.error}</p>}
      {action.done && <p className="ok">{action.done}</p>}
      {result && <SummaryView p={result.p} dry={result.dry} onOpen={onOpen} />}
    </div>
  )
}
