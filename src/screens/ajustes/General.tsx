import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import type { Settings } from '../../types.ts'
import { T } from '../../lib/i18n.tsx'
import { useLocale } from '../../lib/locale-context.ts'

const FIELDS: [string, string, string][] = [
  ['orgName', 'Nombre que se muestra en la aplicación', 'Aparece arriba y en la página del enlace personal.'],
  ['appUrl', 'Dirección de la aplicación', 'La dirección pública (https://…). Se usa para armar los enlaces personales.'],
  ['emisorCentro', 'Emisor genérico del certificado', 'Cuando el certificado no se emite a nombre del sheij. No hace falta nombrar un centro en particular.'],
  ['lugarEmision', 'Lugar de emisión del certificado', 'Ej.: Buenos Aires. Puede quedar vacío.'],
  ['invitacionDias', 'Días de validez de un enlace personal', 'Entre 1 y 30.'],
]

export function General() {
  const { t } = useLocale()
  const s = useLoad(() => api<Settings>('settings.get'), 'settings')
  if (s.error) return <p className="alert"><T>{s.error}</T></p>
  if (!s.data) return <p className="muted"><T>Cargando…</T></p>
  return <GeneralForm initial={s.data} t={t} />
}

function GeneralForm({ initial, t }: { initial: Settings; t: (key: string) => string }) {
  const [f, setF] = useState<Settings>(initial)
  const [reminders, setReminders] = useState(initial.recordatoriosHabilitados === '1')
  const action = useAction()
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { setF(await api<Settings>('settings.save', f)); return 'Guardado' }) }}>
      <h1><T>General</T></h1>
      {FIELDS.map(([k, l, h]) => (
        <label key={k} className="stack"><span><T>{l}</T></span><input value={f[k] ?? ''} dir={k === 'appUrl' ? 'ltr' : undefined} onChange={(e) => setF({ ...f, [k]: e.target.value })} /><span className="help"><T>{h}</T></span></label>
      ))}
      <label className="stack"><span><T>Mensaje que acompaña al enlace personal</T></span><textarea value={f.invitacionMensaje ?? ''} maxLength={500} onChange={(e) => setF({ ...f, invitacionMensaje: e.target.value })} /><span className="help"><T>El enlace se agrega al final.</T></span></label>
      <label className="check"><input type="checkbox" checked={f.enlaceDocumentos === '1'} onChange={(e) => setF({ ...f, enlaceDocumentos: e.target.checked ? '1' : '' })} /><span><T>Permitir que la persona suba foto del DNI o pasaporte desde el enlace</T></span></label>
      <section className="card stack">
        <h2><T>Recordatorios por correo</T></h2>
        <p className="help"><T>Un correo diario a cada sheij activo contiene solo el número de pasos vencidos y el enlace de la aplicación. Se respeta la cuota diaria de correo disponible.</T></p>
        <label className="check"><input type="checkbox" checked={reminders} disabled={action.busy} onChange={(e) => action.run(async () => {
          const enabled = e.target.checked
          const result = await api<{ enabled: boolean }>('recordatorios.configure', { enabled })
          setReminders(result.enabled)
          return t(result.enabled ? 'Recordatorios activados' : 'Recordatorios desactivados')
        })} /><span><T>Enviar recordatorios diarios</T></span></label>
      </section>
      {action.error && <p className="alert"><T>{action.error}</T></p>}
      {action.done && <p className="ok"><T>{action.done}</T></p>}
      <button className="primary" disabled={action.busy}><T>Guardar</T></button>
    </form>
  )
}
