import { api } from '../../api.ts'
import { downloadXlsx } from '../../export/excel.ts'
import { useAction, useLoad } from '../../lib/hooks.ts'
import { conSheij, fecha, hoy } from '../../lib/labels.ts'
import type { Certificado, CertificadoCompleto } from '../../types.ts'
import { T } from '../../lib/i18n.tsx'

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
      <h1><T>Exportar y certificados</T></h1>
      <section className="card stack">
        <h2><T>Lista completa (Excel)</T></h2>
        <p className="muted small"><T>Incluye todos los datos de todos los registros, también los sensibles. Guardá el archivo en un lugar seguro. Cada exportación queda en el registro de actividad.</T></p>
        <div className="row">
          <button className="primary" disabled={action.busy} onClick={() => exportar('es')}><T>Exportar en español</T></button>
          <button disabled={action.busy} onClick={() => exportar('ar')}><T>تصدير بالعربية</T></button>
        </div>
        {action.error && <p className="alert"><T>{action.error}</T></p>}
        {action.done && <p className="ok"><T>{action.done}</T></p>}
      </section>
      <section className="card stack">
        <h2><T>Certificados emitidos</T></h2>
        {certs.error && <p className="alert">{certs.error}</p>}
        {certs.data?.length === 0 && <p className="muted"><T>Todavía no se emitieron certificados.</T></p>}
        <ul className="list">
          {certs.data?.map((c) => (
            <li key={c.id} className="row between">
              <span className="stack tight">
                <span><strong>{c.numero}</strong> <T> · </T>{c.nombre} <span className={c.estado === 'valido' ? 'badge good' : 'badge bad'}><T>{c.estado === 'valido' ? 'Válido' : 'Anulado'}</T></span></span>
                <span className="muted small">{fecha(c.fecha)} <T> · </T><T>{c.emisor === 'maestro' ? conSheij(c.maestroNombre) : 'Centro'}</T></span>
              </span>
              <span className="row">
                <button className="small" onClick={() => onOpen(c.conversoId)}><T>Registro</T></button>
                <button className="small" onClick={() => action.run(async () => { await downloadCertificado(await api<CertificadoCompleto>('certificados.get', { id: c.id })) })}><T>PDF</T></button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
