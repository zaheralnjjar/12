import { api } from '../../api.ts'
import { useLoad } from '../../lib/hooks.ts'
import { T, useLocale } from '../../lib/i18n.tsx'

const ACCION: Record<string, string> = {
  ver_documento: 'Abrió un documento',
  descargar_ficha: 'Descargó una ficha PDF',
  exportar_lista: 'Exportó la lista',
  emitir_certificado: 'Emitió un certificado',
  anular_certificado: 'Anuló un certificado',
  eliminar_registro: 'Eliminó un registro',
  reasignar: 'Reasignó registros',
  importar_formulario: 'Importó el formulario',
}

export function Auditoria() {
  const { language } = useLocale()
  const list = useLoad(() => api<{ email: string; accion: string; objeto: string; detalle: string; createdAt: string }[]>('auditoria.list'), 'audit')
  return (
    <div className="stack">
      <h1><T>Registro de actividad</T></h1>
      <p className="muted small"><T>Las últimas 300 acciones sensibles.</T></p>
      {list.error && <p className="alert"><T>{list.error}</T></p>}
      {list.data && (
        <div className="table-scroll">
          <table>
            <thead><tr><th><T>Fecha</T></th><th><T>Cuenta</T></th><th><T>Acción</T></th><th><T>Registro</T></th><th><T>Detalle</T></th></tr></thead>
            <tbody>
              {list.data.map((a, i) => (
                <tr key={i}><td>{new Date(a.createdAt).toLocaleString(language === 'ar' ? 'ar' : 'es-AR')}</td><td dir="ltr">{a.email}</td><td><T>{ACCION[a.accion] ?? a.accion}</T></td><td>{a.objeto}</td><td>{a.detalle}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
