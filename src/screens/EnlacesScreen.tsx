// One-time registration links for people who embraced Islam remotely: the sheikh sends it by WhatsApp,
// the person fills their own data without an account, and the record arrives assigned to that sheikh.
import { useState } from 'react'
import { api } from '../api.ts'
import { useAction, useLoad } from '../lib/hooks.ts'
import { PAISES, fecha } from '../lib/labels.ts'
import { waShareLink } from '../lib/whatsapp.ts'
import type { Catalogo, Invitacion, Role } from '../types.ts'
import { T, useLocale } from '../lib/i18n.tsx'

const ESTADO: Record<string, [string, string]> = {
  pendiente: ['Pendiente', 'badge warn'],
  usada: ['Completada', 'badge good'],
  vencida: ['Vencida', 'badge dim'],
  revocada: ['Anulada', 'badge dim'],
}

type Creada = { id: string; url: string; mensaje: string; expira: string; waUrl: string }

export function EnlacesScreen({ role, catalogo, readOnly, onOpen }: { role: Role; catalogo: Catalogo; readOnly: boolean; onOpen: (id: string) => void }) {
  const { t } = useLocale()
  const list = useLoad(() => api<Invitacion[]>('invitaciones.list'), 'invitaciones')
  const [f, setF] = useState({ maestroId: '', codigoPais: '54', telefono: '', nota: '' })
  const [creada, setCreada] = useState<Creada | null>(null)
  const [copied, setCopied] = useState(false)
  const action = useAction()

  return (
    <div className="stack">
      <h1><T>Enlaces de registro</T></h1>
      <p className="muted"><T>Para quien hizo la shahada a distancia: generá un enlace personal, mandalo por WhatsApp y la persona completa sus datos sin crear una cuenta. El enlace sirve una sola vez y vence.</T></p>

      {!readOnly && !creada && (
        <form className="card stack" onSubmit={(e) => {
          e.preventDefault()
          action.run(async () => { setCreada(await api<Creada>('invitaciones.create', f)); setCopied(false); list.reload() })
        }}>
          <h2><T>Nuevo enlace</T></h2>
          {role === 'supervisor' && (
            <label className="stack"><span><T>Sheij que lo acompañó</T></span>
              <select value={f.maestroId} onChange={(e) => setF({ ...f, maestroId: e.target.value })}>
                <option value=""><T>— sin asignar —</T></option>
                {catalogo.maestros.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </label>
          )}
          <label className="stack"><span><T>WhatsApp de la persona (opcional)</T></span>
            <div className="phone">
              <select aria-label={t('Código de país')} value={f.codigoPais} onChange={(e) => setF({ ...f, codigoPais: e.target.value })}>
                {PAISES.map((p) => <option key={p.cc} value={p.cc}><T>{p.nombre}</T> +{p.cc}</option>)}
              </select>
              <input type="tel" dir="ltr" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} placeholder="11 2345 6789" />
            </div>
          </label>
          <label className="stack"><span><T>Nota interna (opcional)</T></span><input value={f.nota} maxLength={200} onChange={(e) => setF({ ...f, nota: e.target.value })} placeholder={t('Ej.: shahada por videollamada')} /></label>
          {action.error && <p className="alert"><T>{action.error}</T></p>}
          <button className="primary" disabled={action.busy}><T>Generar enlace</T></button>
        </form>
      )}

      {creada && (
        <div className="card stack">
          <p className="ok"><T>Enlace generado. Vence el </T>{fecha(creada.expira)}<T>. Por seguridad, solo se muestra ahora.</T></p>
          <textarea readOnly value={creada.mensaje} rows={4} />
          <div className="row">
            <a className="button wa" href={creada.waUrl || waShareLink(creada.mensaje)} target="_blank" rel="noopener noreferrer"><T>Enviar por WhatsApp</T></a>
            <button onClick={() => { navigator.clipboard?.writeText(creada.url).then(() => setCopied(true)).catch(() => {}) }}><T>{copied ? 'Copiado' : 'Copiar enlace'}</T></button>
            <button onClick={() => setCreada(null)}><T>Listo</T></button>
          </div>
        </div>
      )}

      <section className="stack">
        <h2><T>Enlaces enviados</T></h2>
        {list.error && <p className="alert"><T>{list.error}</T></p>}
        {list.data && list.data.length === 0 && <p className="muted"><T>Todavía no hay enlaces.</T></p>}
        <ul className="list">
          {list.data?.map((i) => (
            <li key={i.id} className="card row between">
              <span className="stack tight">
                <span><span className={ESTADO[i.estado][1]}><T>{ESTADO[i.estado][0]}</T></span> {i.nota && <span>{i.nota}</span>}</span>
                <span className="muted small">
                  <T>
                  Creado </T>{fecha(i.createdAt)} <T> · vence </T>{fecha(i.expira)}{i.telefono ? ` · ${i.telefono}` : ''}{role === 'supervisor' && <> · {i.maestroNombre || <T>sin sheij</T>}</>}
                </span>
              </span>
              <span className="row">
                {i.conversoId && <button className="small" onClick={() => onOpen(i.conversoId)}><T>Ver registro</T></button>}
                {!readOnly && i.estado === 'pendiente' && <button className="small danger" onClick={() => action.run(async () => { await api('invitaciones.revoke', { id: i.id }); list.reload() })}><T>Anular</T></button>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
