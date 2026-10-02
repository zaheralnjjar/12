import { api } from '../../api.ts'
import { downloadXlsx } from '../../export/excel.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { conSheij, fecha, hoy } from '../../lib/labels.ts'
import type { Certificado, CertificadoCompleto } from '../../types.ts'

const downloadCertificado = async (c: CertificadoCompleto) => (await import('../../export/certificado.ts')).downloadCertificado(c)

export function Exportar({ onOpen }: { onOpen: (id: string) => void }) {
  const certs = useLoad(() => api<Certificado[]>('certificados.list'), 'certs')
  const action = useAction()
  const exportar = (idioma: 'es' | 'ar') => action.run(async () => {
    const r = await api<{ headers: string[]; rows: string[][] }>('export.conversos', { idioma })
    await downloadXlsx(`${idioma === 'ar' ? 'المهتدون' : 'nuevos-musulmanes'}-${hoy()}.xlsx`, r.headers, r.rows, idioma === 'ar')
    return `Se exportaron ${r.rows.length} registros.`
  })
  return (
    <div className="stack">
      <h1>Exportar y certificados</h1>
      <section className="card stack">
        <h2>Lista completa (Excel)</h2>
        <p className="muted small">Incluye todos los datos de todos los registros, también los sensibles. Guardá el archivo en un lugar seguro. Cada exportación queda en el registro de actividad.</p>
        <div className="row">
          <button className="primary" disabled={action.busy} onClick={() => exportar('es')}>Exportar en español</button>
          <button disabled={action.busy} onClick={() => exportar('ar')}>تصدير بالعربية</button>
        </div>
        {action.error && <p className="alert">{action.error}</p>}
        {action.done && <p className="ok">{action.done}</p>}
      </section>
      <section className="card stack">
        <h2>Certificados emitidos</h2>
        {certs.error && <p className="alert">{certs.error}</p>}
        {certs.data?.length === 0 && <p className="muted">Todavía no se emitieron certificados.</p>}
        <ul className="list">
          {certs.data?.map((c) => (
            <li key={c.id} className="row between">
              <span className="stack tight">
                <span><strong>{c.numero}</strong> · {c.nombre} <span className={c.estado === 'valido' ? 'badge good' : 'badge bad'}>{c.estado === 'valido' ? 'Válido' : 'Anulado'}</span></span>
                <span className="muted small">{fecha(c.fecha)} · {c.emisor === 'maestro' ? conSheij(c.maestroNombre) : 'Centro'}</span>
              </span>
              <span className="row">
                <button className="small" onClick={() => onOpen(c.conversoId)}>Registro</button>
                <button className="small" onClick={() => action.run(async () => { await downloadCertificado(await api<CertificadoCompleto>('certificados.get', { id: c.id })) })}>PDF</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
