import { useState } from 'react'
import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { fecha } from '../lib/labels.ts'
import type { Estadisticas } from '../types.ts'

function Barras({ title, items }: { title: string; items: Estadisticas['porMes'] }) {
  const shown = items.slice(-12)
  const max = Math.max(1, ...shown.map((item) => item.total))
  const width = Math.max(320, shown.length * 62)
  return <section className="card stack tight"><h2>{title}</h2>{!shown.length ? <p className="muted">Sin datos.</p> : <div className="chart-scroll"><svg role="img" aria-label={title} viewBox={`0 0 ${width} 170`} width={width} height="170">
    <line x1="20" x2={width - 8} y1="135" y2="135" stroke="currentColor" opacity=".35" />
    {shown.map((item, index) => {
      const x = 32 + index * 62
      const height = Math.max(3, 100 * item.total / max)
      return <g key={item.key}><rect x={x} y={135 - height} width="32" height={height} rx="4" fill="var(--accent)" /><text x={x + 16} y={127 - height} textAnchor="middle" fontSize="12" fill="currentColor">{item.total}</text><text x={x + 16} y="153" textAnchor="middle" fontSize="10" fill="currentColor">{item.nombre}</text></g>
    })}
  </svg></div>}</section>
}

export function EstadisticasScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [days, setDays] = useState(30)
  const stats = useLoad(() => api<Estadisticas>('estadisticas', { diasSinSeguimiento: days }), `estadisticas-${days}`)
  return <div className="stack">
    <h1>Estadísticas</h1>
    <label className="row">Sin seguimiento durante <input type="number" min="1" max="365" value={days} onChange={(event) => setDays(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} style={{ width: 90 }} /> días</label>
    {stats.error && <p className="alert">{stats.error}</p>}
    {!stats.data ? <p className="muted">Cargando…</p> : <>
      <p className="muted">{stats.data.total} registros accesibles · corte de seguimiento: {fecha(stats.data.fechaCorte)}</p>
      <Barras title="Por mes" items={stats.data.porMes} />
      <Barras title="Por año" items={stats.data.porAnio} />
      <Barras title="Por sheij" items={stats.data.porMaestro} />
      <Barras title="Por nacionalidad" items={stats.data.porNacionalidad} />
      <Barras title="Por estado" items={stats.data.porEstado} />
      <section className="card stack"><h2>Sin seguimiento desde hace {stats.data.diasSinSeguimiento} días o más ({stats.data.sinSeguimiento.length})</h2>{!stats.data.sinSeguimiento.length ? <p className="muted">No hay registros pendientes.</p> : <ul className="list">{stats.data.sinSeguimiento.map((record) => <li key={record.id}><button className="rowlink" onClick={() => onOpen(record.id)}><span>{record.nombre}<small className="muted">{record.id}</small></span><span className="muted">{record.ultimoSeguimiento ? `Último: ${fecha(record.ultimoSeguimiento)}` : 'Sin seguimiento registrado'}</span></button></li>)}</ul>}</section>
    </>}
  </div>
}
