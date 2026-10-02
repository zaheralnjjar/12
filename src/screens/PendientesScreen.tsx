import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { fecha } from '../lib/labels.ts'
import type { SeguimientoPendiente } from '../types.ts'

export function PendientesScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const pending = useLoad(() => api<SeguimientoPendiente[]>('seguimiento.pendientes'), 'seguimiento-pendientes')
  if (pending.error) return <p className="alert">{pending.error}</p>
  if (!pending.data) return <p className="muted">Cargando…</p>
  const overdue = pending.data.filter((item) => item.vencido).length
  return (
    <div className="stack">
      <h1>Pendientes</h1>
      <p className="muted">{overdue} pasos vencidos · {pending.data.length - overdue} próximos (7 días)</p>
      {pending.data.length === 0 ? <p className="muted">No hay pasos pendientes.</p> : (
        <ul className="list">
          {pending.data.map((item) => (
            <li key={item.id}>
              <button className="rowlink card" onClick={() => onOpen(item.id)}>
                <span className="main"><strong>{item.nombre}</strong><span className="muted small">{item.proximaAccion || 'Seguimiento'}</span></span>
                <span className={item.vencido ? 'badge bad' : 'badge warn'}>{item.vencido ? 'Vencido' : 'Próximo'} · {fecha(item.proximaFecha)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
