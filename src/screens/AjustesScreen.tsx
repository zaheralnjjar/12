// The supervisor's control panel.
import type { Catalogo, MaestroRef } from '../types.ts'
import { Auditoria } from './ajustes/Auditoria.tsx'
import { Campos } from './ajustes/Campos.tsx'
import { Contactos } from './ajustes/Contactos.tsx'
import { Cuentas } from './ajustes/Cuentas.tsx'
import { Exportar } from './ajustes/Exportar.tsx'
import { Formulario } from './ajustes/Formulario.tsx'
import { General } from './ajustes/General.tsx'
import { Etapas, Nacionalidades } from './ajustes/Listas.tsx'
import { Maestros } from './ajustes/Maestros.tsx'

const SECCIONES: [string, string, string][] = [
  ['general', 'General', 'Nombre del centro, dirección de la app, certificados, enlaces'],
  ['maestros', 'Sheij / maestros', 'Agregar, editar, desactivar, firmas'],
  ['cuentas', 'Cuentas', 'Colaboradores y supervisores'],
  ['campos', 'Campos del registro', 'Obligatorios, enlace, campos propios'],
  ['nacionalidades', 'Nacionalidades', 'La lista que se ofrece'],
  ['etapas', 'Etapas de aprendizaje', 'Lo que se sigue de cada persona'],
  ['formulario', 'Formulario de Google', 'Importar las respuestas'],
  ['exportar', 'Exportar y certificados', 'Lista completa en Excel, certificados emitidos'],
  ['contactos', 'Contactos', 'Instituciones y personas que no son registros'],
  ['auditoria', 'Registro de actividad', 'Exportaciones, certificados, documentos vistos'],
]

export function AjustesScreen({ seccion, catalogo, onSeccion, onCatalogChanged, onPreview, onOpen }: {
  seccion?: string
  catalogo: Catalogo
  onSeccion: (s: string) => void
  onCatalogChanged: () => void
  onPreview: (m: MaestroRef) => void
  onOpen: (id: string) => void
}) {
  switch (seccion) {
    case 'general': return <General />
    case 'maestros': return <Maestros onChanged={onCatalogChanged} onPreview={onPreview} />
    case 'cuentas': return <Cuentas />
    case 'campos': return <Campos catalogo={catalogo} onChanged={onCatalogChanged} />
    case 'nacionalidades': return <Nacionalidades catalogo={catalogo} onChanged={onCatalogChanged} />
    case 'etapas': return <Etapas catalogo={catalogo} onChanged={onCatalogChanged} />
    case 'formulario': return <Formulario onOpen={onOpen} />
    case 'exportar': return <Exportar onOpen={onOpen} />
    case 'contactos': return <Contactos />
    case 'auditoria': return <Auditoria />
  }
  return (
    <div className="stack">
      <h1>Ajustes</h1>
      <div className="menu">
        {SECCIONES.map(([id, t, d]) => (
          <button key={id} className="card" onClick={() => onSeccion(id)}>
            <strong>{t}</strong>
            <small>{d}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
