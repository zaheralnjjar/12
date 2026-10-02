import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { ROLE_LABEL, fecha } from '../../lib/labels.ts'
import type { Usuario } from '../../types.ts'
import { T } from '../../lib/i18n.tsx'

export function Cuentas() {
  const list = useLoad(() => api<Usuario[]>('usuarios.list'), 'usuarios')
  const [f, setF] = useState({ email: '', role: 'colaborador', expiry: '' })
  const action = useAction()
  return (
    <div className="stack">
      <h1><T>Cuentas</T></h1>
      <p className="muted small"><T>El </T><strong><T>colaborador</T></strong> <T> <T> solo registra personas nuevas: después de enviar no ve nada, ni listas ni búsquedas. El </T></T><strong><T>supervisor</T></strong> <T> <T> ve todo. Los sheij se agregan en «Sheij / maestros».</T></T></p>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('usuarios.save', f); setF({ email: '', role: 'colaborador', expiry: '' }); list.reload(); return 'Cuenta habilitada' }) }}>
        <h2><T>Agregar cuenta</T></h2>
        <label className="stack"><span><T>Correo de Google</T></span><input type="email" dir="ltr" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label className="stack"><span><T>Rol</T></span>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="colaborador"><T>Colaborador</T></option>
            <option value="supervisor"><T>Supervisor</T></option>
          </select>
        </label>
        {f.role === 'colaborador' && <label className="stack"><span><T>Acceso hasta (opcional)</T></span><input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></label>}
        {action.error && <p className="alert"><T>{action.error}</T></p>}
        {action.done && <p className="ok"><T>{action.done}</T></p>}
        <button className="primary" disabled={action.busy}><T>Habilitar</T></button>
      </form>
      {list.error && <p className="alert"><T>{list.error}</T></p>}
      <ul className="list">
        {list.data?.map((u) => (
          <li key={u.email} className={u.active ? 'card row between' : 'card row between inactive'}>
            <span className="stack tight">
              <span dir="ltr" style={{ textAlign: 'start' }}>{u.email}</span>
              <span className="muted small"><T>{ROLE_LABEL[u.role]}</T>{u.expiry ? <> · <T>hasta</T> {fecha(u.expiry)}</> : ''}{u.lastLogin ? <> · <T>último ingreso</T> {fecha(u.lastLogin)}</> : ''}{u.active ? '' : <> · <T>desactivada</T></>}</span>
            </span>
            {u.active && !u.isMe && <button className="small danger" onClick={() => action.run(async () => { await api('usuarios.disable', { email: u.email }); list.reload() })}><T>Desactivar</T></button>}
            {!u.active && <button className="small" onClick={() => action.run(async () => { await api('usuarios.save', { email: u.email, role: u.role, expiry: '' }); list.reload() })}><T>Reactivar</T></button>}
          </li>
        ))}
      </ul>
    </div>
  )
}
