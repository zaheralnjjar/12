import { api } from '../../api.ts'
import { useLoad } from '../../lib/hooks.ts'

const ACCION: Record<string, string> = {
  ver_documento: 'Abrió un documento',
  exportar_lista: 'Exportó la lista',
  emitir_certificado: 'Emitió un certificado',
  anular_certificado: 'Anuló un certificado',
  eliminar_registro: 'Eliminó un registro',
  reasignar: 'Reasignó registros',
  importar_formulario: 'Importó el formulario',
}

export function Auditoria() {
  const list = useLoad(() => api<{ email: string; accion: string; objeto: string; detalle: string; createdAt: string }[]>('auditoria.list'), 'audit')
  return (
    <div className="stack">
      <h1>Registro de actividad</h1>
      <p className="muted small">Las últimas 300 acciones sensibles.</p>
      {list.error && <p className="alert">{list.error}</p>}
      {list.data && (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Fecha</th><th>Cuenta</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr></thead>
            <tbody>
              {list.data.map((a, i) => (
                <tr key={i}><td>{new Date(a.createdAt).toLocaleString('es-AR')}</td><td dir="ltr">{a.email}</td><td>{ACCION[a.accion] ?? a.accion}</td><td>{a.objeto}</td><td>{a.detalle}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
