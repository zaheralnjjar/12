import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import type { Settings } from '../../types.ts'

const FIELDS: [string, string, string][] = [
  ['orgName', 'Nombre que se muestra en la aplicación', 'Aparece arriba y en la página del enlace personal.'],
  ['appUrl', 'Dirección de la aplicación', 'La dirección pública (https://…). Se usa para armar los enlaces personales.'],
  ['emisorCentro', 'Emisor genérico del certificado', 'Cuando el certificado no se emite a nombre del sheij. No hace falta nombrar un centro en particular.'],
  ['lugarEmision', 'Lugar de emisión del certificado', 'Ej.: Buenos Aires. Puede quedar vacío.'],
  ['invitacionDias', 'Días de validez de un enlace personal', 'Entre 1 y 30.'],
]

export function General() {
  const s = useLoad(() => api<Settings>('settings.get'), 'settings')
  if (s.error) return <p className="alert">{s.error}</p>
  if (!s.data) return <p className="muted">Cargando…</p>
  return <GeneralForm initial={s.data} />
}

function GeneralForm({ initial }: { initial: Settings }) {
  const [f, setF] = useState<Settings>(initial)
  const action = useAction()
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { setF(await api<Settings>('settings.save', f)); return 'Guardado' }) }}>
      <h1>General</h1>
      {FIELDS.map(([k, l, h]) => (
        <label key={k} className="stack"><span>{l}</span><input value={f[k] ?? ''} dir={k === 'appUrl' ? 'ltr' : undefined} onChange={(e) => setF({ ...f, [k]: e.target.value })} /><span className="help">{h}</span></label>
      ))}
      <label className="stack"><span>Mensaje que acompaña al enlace personal</span><textarea value={f.invitacionMensaje ?? ''} maxLength={500} onChange={(e) => setF({ ...f, invitacionMensaje: e.target.value })} /><span className="help">El enlace se agrega al final.</span></label>
      <label className="check"><input type="checkbox" checked={f.enlaceDocumentos === '1'} onChange={(e) => setF({ ...f, enlaceDocumentos: e.target.checked ? '1' : '' })} /><span>Permitir que la persona suba foto del DNI o pasaporte desde el enlace</span></label>
      {action.error && <p className="alert">{action.error}</p>}
      {action.done && <p className="ok">{action.done}</p>}
      <button className="primary" disabled={action.busy}>Guardar</button>
    </form>
  )
}
