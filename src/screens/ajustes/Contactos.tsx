// Institutions and people the centre works with. Kept apart from the records of converts.
import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { waLink } from '../../lib/whatsapp.ts'
import type { Contacto } from '../../types.ts'
import { T } from '../../lib/i18n.tsx'
import { useLocale } from '../../lib/locale-context.ts'

const empty = (): Contacto => ({ id: '', nombre: '', tipo: '', organizacion: '', cargo: '', telefono: '', email: '', ciudad: '', notas: '', active: true })

export function Contactos() {
  const { t } = useLocale()
  const list = useLoad(() => api<Contacto[]>('contactos.list'), 'contactos')
  const [edit, setEdit] = useState<Contacto | null>(null)
  const [q, setQ] = useState('')
  const action = useAction()
  const shown = (list.data ?? []).filter((c) => !q || JSON.stringify(c).toLowerCase().includes(q.toLowerCase()))
  const field = (k: keyof Contacto, l: string, type = 'text') => edit && (
    <label className="stack"><span>{l}</span><input type={type} value={String(edit[k] ?? '')} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></label>
  )
  return (
    <div className="stack">
      <div className="section-title"><h1><T>Contactos</T></h1>{!edit && <button className="primary" onClick={() => setEdit(empty())}><T>+ Agregar</T></button>}</div>
      {edit && (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('contactos.save', edit); setEdit(null); list.reload() }) }}>
          {field('nombre', 'Nombre *')}
          <div className="two">{field('organizacion', 'Institución')}{field('cargo', 'Cargo')}</div>
          <div className="two">{field('tipo', 'Tipo (mezquita, ONG, abogado…)')}{field('ciudad', 'Ciudad')}</div>
          <div className="two">{field('telefono', t('Teléfono'), 'tel')}{field('email', t('Correo'), 'email')}</div>
          <label className="stack"><span><T>Notas</T></span><textarea value={edit.notas} onChange={(e) => setEdit({ ...edit, notas: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /><span><T>Activo</T></span></label>
          {action.error && <p className="alert"><T>{action.error}</T></p>}
          <div className="row"><button className="primary" disabled={action.busy}><T>Guardar</T></button><button type="button" onClick={() => setEdit(null)}><T>Cancelar</T></button></div>
        </form>
      )}
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Buscar')} aria-label={t('Buscar contacto')} />
      {list.error && <p className="alert"><T>{list.error}</T></p>}
      <ul className="list">
        {shown.map((c) => (
          <li key={c.id} className={c.active ? 'card row between' : 'card row between inactive'}>
            <span className="stack tight">
              <strong>{c.nombre}</strong>
              <span className="muted small">{[c.cargo, c.organizacion, c.tipo, c.ciudad].filter(Boolean).join(' · ')}</span>
              <span className="small" dir="ltr" style={{ textAlign: 'start' }}>{[c.telefono, c.email].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="row">
              {waLink(c.telefono) && <a className="button small wa" href={waLink(c.telefono) ?? ''} target="_blank" rel="noopener noreferrer"><T>WhatsApp</T></a>}
              <button className="small" onClick={() => setEdit(c)}><T>Editar</T></button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
