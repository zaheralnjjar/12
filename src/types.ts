export type Role = 'supervisor' | 'maestro' | 'colaborador'

export type MaestroRef = { id: string; nombre: string; active: boolean }
export type Maestro = MaestroRef & { alias: string; telefono: string; email: string; tieneFirma: boolean; total?: number }

export type Me = {
  user: { email: string; role: Role; maestroId: string; preview: boolean }
  maestro: Maestro | null
  org: string
}

export type Campo = {
  key: string
  etiqueta: string
  etiquetaAr: string
  tipo: string
  seccion: string
  requerido: boolean
  enEnlace: boolean
  active: boolean
  fixed: boolean
  internal: boolean
  custom: boolean
  opciones: string[]
  ayuda: string
}

export type Catalogo = {
  campos: Campo[]
  nacionalidades: { id: string; nombre: string; active: boolean }[]
  maestros: MaestroRef[]
  etapas: { id: string; nombre: string; descripcion: string; active: boolean }[]
}

export type Estado = 'activo' | 'sin_contacto' | 'se_mudo' | 'archivado'

export type ConversoResumen = {
  id: string
  nombre: string
  nombreIslamico: string
  sexo: string
  nacionalidad: string
  ciudad: string
  maestroId: string
  maestroNombre: string
  estado: Estado
  revisar: boolean
  motivosRevision?: string
  origen: string
  createdAt: string
  ultimoSeguimiento: string
  proximaFecha: string
  proximaAccion: string
}

export type Estadisticas = {
  total: number
  diasSinSeguimiento: number
  fechaCorte: string
  porMes: { key: string; nombre: string; total: number }[]
  porAnio: { key: string; nombre: string; total: number }[]
  porMaestro: { key: string; nombre: string; total: number }[]
  porNacionalidad: { key: string; nombre: string; total: number }[]
  porEstado: { key: string; nombre: string; total: number }[]
  sinSeguimiento: { id: string; nombre: string; ultimoSeguimiento: string }[]
}

export type ExtraValue = string | string[]

/** The whole record: every column of the sheet as text, plus the custom answers. */
export type Converso = Record<string, string> & { extra: Record<string, ExtraValue> } & {
  id: string
  nombre: string
  maestroNombre: string
  estado: Estado
}

export type Seguimiento = {
  id: string
  conversoId: string
  autor: string
  fecha: string
  tipo: string
  resumen: string
  proximaAccion: string
  proximaFecha: string
  createdAt: string
}

export type SeguimientoPendiente = { id: string; nombre: string; proximaFecha: string; proximaAccion: string; vencido: boolean }

export type Documento = { id: string; tipo: string; fileName: string; mime: string; uploadedAt: string }

export type Certificado = {
  id: string
  numero: string
  conversoId: string
  maestroId: string
  maestroNombre: string
  emisor: 'maestro' | 'centro'
  idioma: 'es' | 'es_ar'
  fecha: string
  estado: 'valido' | 'anulado'
  anuladoMotivo: string
  emitidoPor: string
  createdAt: string
  nombre?: string
}

export type CertificadoDatos = {
  nombre: string
  nombreIslamico: string
  sexo: string
  nacionalidad: string
  tipoDocumento: string
  numeroDocumento: string
  fechaShahada: string
  lugarShahada: string
  maestroNombre: string
  emisorTexto: string
  lugarEmision: string
  fechaEmision: string
  conversoId: string
}

export type CertificadoCompleto = Certificado & { datos: CertificadoDatos; firma: string | null; orgName: string }

export type ConversoDetalle = {
  converso: Converso
  seguimiento: Seguimiento[]
  progreso: { etapaId: string; nombre: string; fecha: string; autor: string }[]
  documentos: Documento[]
  certificados: Certificado[]
}

export type Resumen = {
  total: number
  porEstado: Record<Estado, number>
  revisar: number
  delMes: number
  proximas: ConversoResumen[]
  porMaestro: { maestroId: string; nombre: string; total: number }[]
}

export type Invitacion = {
  id: string
  maestroId: string
  maestroNombre: string
  creadoPor: string
  telefono: string
  nota: string
  expira: string
  estado: 'pendiente' | 'usada' | 'vencida' | 'revocada'
  usadoAt: string
  conversoId: string
  createdAt: string
}

export type Settings = Record<string, string>

export type Usuario = { email: string; role: Role; active: boolean; expiry: string; lastLogin: string; isMe: boolean }

export type Contacto = {
  id: string
  nombre: string
  tipo: string
  organizacion: string
  cargo: string
  telefono: string
  email: string
  ciudad: string
  notas: string
  active: boolean
}

export type CampoPublico = Pick<Campo, 'key' | 'etiqueta' | 'tipo' | 'seccion' | 'requerido' | 'opciones' | 'ayuda' | 'custom'>
export type FormularioPublico = { org: string; campos: CampoPublico[]; nacionalidades: string[]; documentos: boolean }

export type DocAdjunto = { tipo: string; dataUrl: string; nombre: string }
