import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { ROLE_LABEL, fecha } from '../../lib/labels.ts'
import type { Usuario } from '../../types.ts'

export function Cuentas() {
  const list = useLoad(() => api<Usuario[]>('usuarios.list'), 'usuarios')
  const [f, setF] = useState({ email: '', role: 'colaborador', expiry: '' })
  const action = useAction()
  return (
    <div className="stack">
      <h1>Cuentas</h1>
      <p className="muted small">El <strong>colaborador</strong> solo registra personas nuevas: después de enviar no ve nada, ni listas ni búsquedas. El <strong>supervisor</strong> ve todo. Los sheij se agregan en «Sheij / maestros».</p>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); action.run(async () => { await api('usuarios.save', f); setF({ email: '', role: 'colaborador', expiry: '' }); list.reload(); return 'Cuenta habilitada' }) }}>
        <h2>Agregar cuenta</h2>
        <label className="stack"><span>Correo de Google</span><input type="email" dir="ltr" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label className="stack"><span>Rol</span>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <option value="colaborador">Colaborador</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </label>
        {f.role === 'colaborador' && <label className="stack"><span>Acceso hasta (opcional)</span><input type="date" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></label>}
        {action.error && <p className="alert">{action.error}</p>}
        {action.done && <p className="ok">{action.done}</p>}
        <button className="primary" disabled={action.busy}>Habilitar</button>
      </form>
      {list.error && <p className="alert">{list.error}</p>}
      <ul className="list">
        {list.data?.map((u) => (
          <li key={u.email} className={u.active ? 'card row between' : 'card row between inactive'}>
            <span className="stack tight">
              <span dir="ltr" style={{ textAlign: 'start' }}>{u.email}</span>
              <span className="muted small">{ROLE_LABEL[u.role]}{u.expiry ? ` · hasta ${fecha(u.expiry)}` : ''}{u.lastLogin ? ` · último ingreso ${fecha(u.lastLogin)}` : ''}{u.active ? '' : ' · desactivada'}</span>
            </span>
            {u.active && !u.isMe && <button className="small danger" onClick={() => action.run(async () => { await api('usuarios.disable', { email: u.email }); list.reload() })}>Desactivar</button>}
            {!u.active && <button className="small" onClick={() => action.run(async () => { await api('usuarios.save', { email: u.email, role: u.role, expiry: '' }); list.reload() })}>Reactivar</button>}
          </li>
        ))}
      </ul>
    </div>
  )
}
