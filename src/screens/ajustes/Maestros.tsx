// Sheikhs: the one who witnessed the shahada is the one who follows the person. A sheikh who leaves is
// deactivated, never deleted, so old records keep his name; his active records move to another sheikh.
import { useState } from 'react'
import { api } from '../../api.ts'
import { SignaturePad } from '../../components/SignaturePad.tsx'
import { useAction, useLoad } from '../../lib/hooks.ts'
import type { Maestro, MaestroRef } from '../../types.ts'

type Edit = { id?: string; nombre: string; email: string; telefono: string; alias: string }

export function Maestros({ onChanged, onPreview }: { onChanged: () => void; onPreview: (m: MaestroRef) => void }) {
  const list = useLoad(() => api<Maestro[]>('maestros.list'), 'maestros')
  const [edit, setEdit] = useState<Edit | null>(null)
  const [off, setOff] = useState<Maestro | null>(null)
  const [to, setTo] = useState('')
  const [firmaDe, setFirmaDe] = useState<Maestro | null>(null)
  const action = useAction()
  const reload = () => { list.reload(); onChanged() }
  const activos = (list.data ?? []).filter((m) => m.active)

  return (
    <div className="stack">
      <div className="section-title"><h1>Sheij / maestros</h1>{!edit && <button className="primary" onClick={() => setEdit({ nombre: '', email: '', telefono: '', alias: '' })}>+ Agregar</button>}</div>
      <p className="muted small">Con un correo de Google, el sheij puede entrar y ve solo las personas asignadas a él. Sin correo, figura solo como nombre. Las «otras formas de escribir el nombre» sirven para reconocerlo en las respuestas del formulario de Google.</p>

      {edit && (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('maestros.save', edit); setEdit(null); reload() }) }}>
          <h2>{edit.id ? 'Editar' : 'Nuevo sheij'}</h2>
          <label className="stack"><span>Nombre <span className="req">*</span></span><input required value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} /></label>
          <label className="stack"><span>Correo de Google (para entrar)</span><input type="email" dir="ltr" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
          <label className="stack"><span>Teléfono</span><input type="tel" dir="ltr" value={edit.telefono} onChange={(e) => setEdit({ ...edit, telefono: e.target.value })} /></label>
          <label className="stack"><span>Otras formas de escribir el nombre</span><input value={edit.alias} onChange={(e) => setEdit({ ...edit, alias: e.target.value })} placeholder="Separadas por comas: Ahmad, Ahmed, Sheij Ahmed" /></label>
          {action.error && <p className="alert">{action.error}</p>}
          <div className="row"><button className="primary" disabled={action.busy}>Guardar</button><button type="button" onClick={() => setEdit(null)}>Cancelar</button></div>
        </form>
      )}

      {off && (
        <div className="card note stack">
          <h2>Desactivar a {off.nombre}</h2>
          <p>Deja de poder entrar y no aparece para registros nuevos. Su nombre queda en los registros anteriores.</p>
          {(off.total ?? 0) > 0 && (
            <label className="stack"><span>Pasar sus registros activos a</span>
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">— elegir —</option>
                {activos.filter((m) => m.id !== off.id).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </label>
          )}
          {action.error && <p className="alert">{action.error}</p>}
          <div className="row">
            <button className="danger" disabled={action.busy} onClick={() => action.run(async () => { await api('maestros.setActive', { id: off.id, active: false, reasignarA: to }); setOff(null); setTo(''); reload() })}>Desactivar</button>
            <button onClick={() => setOff(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {firmaDe && (
        <div className="card stack">
          <div className="section-title"><h2>Firma de {firmaDe.nombre}</h2><button className="small" onClick={() => setFirmaDe(null)}>Cerrar</button></div>
          <FirmaDe m={firmaDe} onSaved={reload} />
        </div>
      )}

      {list.error && <p className="alert">{list.error}</p>}
      <ul className="list">
        {list.data?.map((m) => (
          <li key={m.id} className={m.active ? 'card stack tight' : 'card stack tight inactive'}>
            <div className="row between">
              <strong>{m.nombre}</strong>
              <span className="row">
                {!m.active && <span className="badge dim">Inactivo</span>}
                <span className="badge">{m.total ?? 0} registros</span>
              </span>
            </div>
            <span className="muted small">{m.email || 'sin cuenta'}{m.telefono ? ` · ${m.telefono}` : ''}{m.alias ? ` · también: ${m.alias}` : ''}{m.tieneFirma ? ' · con firma' : ''}</span>
            <div className="row">
              <button className="small" onClick={() => setEdit({ id: m.id, nombre: m.nombre, email: m.email, telefono: m.telefono, alias: m.alias })}>Editar</button>
              <button className="small" onClick={() => setFirmaDe(m)}>Firma</button>
              {m.active && <button className="small" onClick={() => onPreview(m)}>Ver como él</button>}
              {m.active
                ? <button className="small danger" onClick={() => { setOff(m); setTo('') }}>Desactivar</button>
                : <button className="small" onClick={() => action.run(async () => { await api('maestros.setActive', { id: m.id, active: true }); reload() })}>Reactivar</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FirmaDe({ m, onSaved }: { m: Maestro; onSaved: () => void }) {
  const f = useLoad(() => api<{ dataUrl: string | null }>('firma.get', { maestroId: m.id }), `firma-${m.id}`)
  if (f.error) return <p className="alert">{f.error}</p>
  if (!f.data) return <p className="muted">Cargando…</p>
  return <SignaturePad current={f.data.dataUrl} onSave={async (dataUrl) => { await api('firma.save', { maestroId: m.id, dataUrl }); f.reload(); onSaved() }} />
}
