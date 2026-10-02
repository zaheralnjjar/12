import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { fecha } from '../lib/labels.ts'
import type { SeguimientoPendiente } from '../types.ts'
import { T } from '../lib/i18n.tsx'

export function PendientesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const pending = useLoad(() => api<SeguimientoPendiente[]>('seguimiento.pendientes'), 'seguimiento-pendientes')
  if (pending.error) return <p className="alert">{pending.error}</p>
  if (!pending.data) return <p className="muted"><T>Cargando…</T></p>
  const overdue = pending.data.filter((item) => item.vencido).length
  return (
    <div className="stack">
      <h1><T>Pendientes</T></h1>
      <p className="muted">{overdue} <T> <T> pasos vencidos · </T></T>{pending.data.length - overdue} <T> <T> próximos (7 días)</T></T></p>
      {pending.data.length === 0 ? <p className="muted"><T>No hay pasos pendientes.</T></p> : (
        <ul className="list">
          {pending.data.map((item) => (
            <li key={item.id}>
              <button className="rowlink card" onClick={() => onOpen(item.id)}>
                <span className="main"><strong>{item.nombre}</strong><span className="muted small">{item.proximaAccion || <T>Seguimiento</T>}</span></span>
                <span className={item.vencido ? 'badge bad' : 'badge warn'}><T>{item.vencido ? 'Vencido' : 'Próximo'}</T> <T> · </T>{fecha(item.proximaFecha)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
