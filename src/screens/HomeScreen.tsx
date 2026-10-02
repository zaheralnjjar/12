import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { ESTADO_LABEL, fecha } from '../lib/labels.ts'
import type { Resumen, Role } from '../types.ts'
import type { Filtro } from './ConversosScreen.tsx'

export function HomeScreen({ role, nombre, onOpen, onList, onNuevo }: {
  role: Role
  nombre: string
  onOpen: (id: string) => void
  onList: (f: Filtro) => void
  onNuevo: () => void
}) {
  const r = useLoad(() => api<Resumen>('resumen'), 'resumen')
  if (r.error) return <p className="alert">{r.error}</p>
  if (!r.data) return <p className="muted">Cargando…</p>
  const d = r.data
  return (
    <div className="stack">
      <div className="row between">
        <h1>{role === 'maestro' ? `Assalamu alaikum${nombre ? ', ' + nombre : ''}` : 'Resumen'}</h1>
        <button className="primary" onClick={onNuevo}>+ Registrar persona</button>
      </div>
      <div className="tiles">
        <button className="tile" onClick={() => onList({})}><small>{role === 'maestro' ? 'Mis registros' : 'Registros'}</small><strong>{d.total}</strong></button>
        <div className="tile"><small>Shahadas de este mes</small><strong>{d.delMes}</strong></div>
        {d.revisar > 0 && <button className="tile" onClick={() => onList({ revisar: true })}><small>A revisar</small><strong>{d.revisar}</strong></button>}
        {Object.entries(d.porEstado).filter(([k]) => k !== 'activo').map(([k, v]) => (
          <button className="tile" key={k} onClick={() => onList({ estado: k })}><small>{ESTADO_LABEL[k]}</small><strong>{v}</strong></button>
        ))}
      </div>

      <section className="card stack">
        <h2>Próximos pasos (7 días)</h2>
        {d.proximas.length === 0 ? <p className="muted">No hay pasos programados para esta semana.</p> : (
          <ul className="list">
            {d.proximas.map((c) => (
              <li key={c.id}>
                <button className="rowlink" onClick={() => onOpen(c.id)}>
                  <span className="main"><strong>{c.nombre}</strong><span className="muted small">{c.proximaAccion || 'Seguimiento'}</span></span>
                  <span className="badge warn">{fecha(c.proximaFecha)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {role === 'supervisor' && d.porMaestro.length > 0 && (
        <section className="card stack">
          <h2>Por sheij</h2>
          <ul className="list">
            {d.porMaestro.sort((a, b) => b.total - a.total).map((m) => (
              <li key={m.maestroId || '-'}>
                <button className="rowlink" onClick={() => onList(m.maestroId ? { maestroId: m.maestroId } : { sinMaestro: true })}>
                  <span>{m.nombre || 'Sin sheij asignado'}</span>
                  <strong>{m.total}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
