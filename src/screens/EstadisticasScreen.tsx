import { useState } from 'react'
import { api } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { ESTADO_LABEL, fecha } from '../lib/labels.ts'
import type { Estadisticas } from '../types.ts'

function Barras({ title, items, latest = false, horizontal = true }: { title: string; items: Estadisticas['porMes']; latest?: boolean; horizontal?: boolean }) {
  const shown = latest ? items.slice(-12) : items.slice(0, 12)
  const max = Math.max(1, ...shown.map((item) => item.total))
  const width = Math.max(320, shown.length * 62)
  const chartHeight = horizontal ? Math.max(56, shown.length * 28 + 8) : 170
  return <section className="card stack tight"><h2>{title}</h2>{!shown.length ? <p className="muted">Sin datos.</p> : <div className="chart-scroll"><svg role="img" aria-label={title} viewBox={`0 0 ${horizontal ? 440 : width} ${chartHeight}`} width={horizontal ? 440 : width} height={chartHeight}>
    {horizontal ? shown.map((item, index) => {
      const y = 5 + index * 28
      const barWidth = Math.max(3, 190 * item.total / max)
      const label = item.nombre.length > 22 ? `${item.nombre.slice(0, 21)}…` : item.nombre
      return <g key={item.key}><text x="0" y={y + 15} fontSize="12" fill="currentColor">{label}</text><rect x="190" y={y} width={barWidth} height="18" rx="4" fill="var(--accent)" /><text x={198 + barWidth} y={y + 14} fontSize="12" fill="currentColor">{item.total}</text></g>
    }) : <>
      <line x1="20" x2={width - 8} y1="135" y2="135" stroke="currentColor" opacity=".35" />
      {shown.map((item, index) => {
        const x = 32 + index * 62
        const height = Math.max(3, 100 * item.total / max)
        return <g key={item.key}><rect x={x} y={135 - height} width="32" height={height} rx="4" fill="var(--accent)" /><text x={x + 16} y={127 - height} textAnchor="middle" fontSize="12" fill="currentColor">{item.total}</text><text x={x + 16} y="153" textAnchor="middle" fontSize="10" fill="currentColor">{item.nombre}</text></g>
      })}
    </>}
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
      <Barras title="Por mes" items={stats.data.porMes} latest horizontal={false} />
      <Barras title="Por año" items={stats.data.porAnio} latest horizontal={false} />
      <Barras title="Por sheij" items={stats.data.porMaestro} />
      <Barras title="Por nacionalidad" items={stats.data.porNacionalidad} />
      <Barras title="Por estado" items={stats.data.porEstado.map((item) => ({ ...item, nombre: ESTADO_LABEL[item.key] || item.nombre }))} />
      <section className="card stack"><h2>Sin seguimiento desde hace {stats.data.diasSinSeguimiento} días o más ({stats.data.sinSeguimiento.length})</h2>{!stats.data.sinSeguimiento.length ? <p className="muted">No hay registros pendientes.</p> : <ul className="list">{stats.data.sinSeguimiento.map((record) => <li key={record.id}><button className="rowlink" onClick={() => onOpen(record.id)}><span>{record.nombre}<small className="muted">{record.id}</small></span><span className="muted">{record.ultimoSeguimiento ? `Último: ${fecha(record.ultimoSeguimiento)}` : 'Sin seguimiento registrado'}</span></button></li>)}</ul>}</section>
    </>}
  </div>
}
