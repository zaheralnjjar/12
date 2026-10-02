import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { ESTADO_LABEL, fecha } from '../lib/labels.ts'
import type { Resumen, Role } from '../types.ts'
import type { Filtro } from './ConversosScreen.tsx'
import { T } from '../lib/i18n.tsx'

export function HomeScreen({ role, nombre, onOpen, onList, onRevision, onStats, onNuevo }: {
  role: Role
  nombre: string
  onOpen: (id: string) => void
  onList: (f: Filtro) => void
  onRevision: () => void
  onStats: () => void
  onNuevo: () => void
}) {
  const r = useLoad(() => api<Resumen>('resumen'), 'resumen')
  if (r.error) return <p className="alert">{r.error}</p>
  if (!r.data) return <p className="muted"><T>Cargando…</T></p>
  const d = r.data
  return (
    <div className="stack">
      <div className="row between">
        <h1><T>{role === 'maestro' ? `Assalamu alaikum${nombre ? ', ' + nombre : ''}` : 'Resumen'}</T></h1>
        <button className="primary" onClick={onNuevo}><T>+ Registrar persona</T></button>
      </div>
      <div className="tiles">
        <button className="tile" onClick={() => onList({})}><small><T>{role === 'maestro' ? 'Mis registros' : 'Registros'}</T></small><strong>{d.total}</strong></button>
        <div className="tile"><small><T>Shahadas de este mes</T></small><strong>{d.delMes}</strong></div>
        <button className="tile" onClick={onStats}><small><T>Estadísticas</T></small><strong><T>↗</T></strong></button>
        {d.revisar > 0 && (role === 'supervisor' ? <button className="tile" onClick={onRevision}><small><T>A revisar</T></small><strong>{d.revisar}</strong></button> : <button className="tile" onClick={() => onList({ revisar: true })}><small><T>A revisar</T></small><strong>{d.revisar}</strong></button>)}
        {Object.entries(d.porEstado).filter(([k]) => k !== 'activo').map(([k, v]) => (
          <button className="tile" key={k} onClick={() => onList({ estado: k })}><small><T>{ESTADO_LABEL[k]}</T></small><strong>{v}</strong></button>
        ))}
      </div>

      <section className="card stack">
        <h2><T>Próximos pasos (7 días)</T></h2>
        {d.proximas.length === 0 ? <p className="muted"><T>No hay pasos programados para esta semana.</T></p> : (
          <ul className="list">
            {d.proximas.map((c) => (
              <li key={c.id}>
                <button className="rowlink" onClick={() => onOpen(c.id)}>
                  <span className="main"><strong>{c.nombre}</strong><span className="muted small">{c.proximaAccion || <T>Seguimiento</T>}</span></span>
                  <span className="badge warn">{fecha(c.proximaFecha)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {role === 'supervisor' && d.porMaestro.length > 0 && (
        <section className="card stack">
          <h2><T>Por sheij</T></h2>
          <ul className="list">
            {d.porMaestro.sort((a, b) => b.total - a.total).map((m) => (
              <li key={m.maestroId || '-'}>
                <button className="rowlink" onClick={() => onList(m.maestroId ? { maestroId: m.maestroId } : { sinMaestro: true })}>
                  <span>{m.nombre || <T>Sin sheij asignado</T>}</span>
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
