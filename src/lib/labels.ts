// Spanish labels for the values the server stores as keys, and small display helpers.

export const ESTADO_LABEL: Record<string, string> = {
  activo: 'Activo',
  sin_contacto: 'Sin contacto',
  se_mudo: 'Se mudó',
  archivado: 'Archivado',
}

export const SEGUIMIENTO_LABEL: Record<string, string> = {
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  visita: 'Visita',
  clase: 'Clase',
  mezquita: 'En la mezquita',
  otro: 'Otro',
}

export const DOC_LABEL: Record<string, string> = {
  dni_frente: 'DNI (frente)',
  dni_dorso: 'DNI (dorso)',
  pasaporte: 'Pasaporte',
  partida_nacimiento: 'Partida de nacimiento',
  foto: 'Foto',
  otro: 'Otro documento',
}

export const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}

export const SECCION_LABEL: Record<string, string> = {
  personal: 'Datos personales',
  documento: 'Documento',
  contacto: 'Contacto',
  islam: 'Shahada y mezquita',
  vida: 'Trabajo, estudios y vida',
  otros: 'Otros',
}
export const SECCIONES = Object.keys(SECCION_LABEL)

export const SEXO_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino' }

export const ORIGEN_LABEL: Record<string, string> = {
  formulario: 'Formulario de Google',
  colaborador: 'Colaborador',
  manual: 'En la aplicación',
  enlace: 'Enlace personal',
}

export const ROLE_LABEL: Record<string, string> = { supervisor: 'Supervisor', maestro: 'Sheij / maestro', colaborador: 'Colaborador' }

export const TIPO_CAMPO_LABEL: Record<string, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  choice: 'Una opción',
  multichoice: 'Varias opciones',
  yesno: 'Sí / No',
}

/** Country codes offered next to the WhatsApp number (Argentina first). */
export const PAISES: { cc: string; nombre: string }[] = [
  { cc: '54', nombre: 'Argentina' },
  { cc: '598', nombre: 'Uruguay' },
  { cc: '595', nombre: 'Paraguay' },
  { cc: '56', nombre: 'Chile' },
  { cc: '591', nombre: 'Bolivia' },
  { cc: '55', nombre: 'Brasil' },
  { cc: '51', nombre: 'Perú' },
  { cc: '58', nombre: 'Venezuela' },
  { cc: '57', nombre: 'Colombia' },
  { cc: '593', nombre: 'Ecuador' },
  { cc: '52', nombre: 'México' },
  { cc: '53', nombre: 'Cuba' },
  { cc: '1', nombre: 'EE. UU. / Canadá' },
  { cc: '34', nombre: 'España' },
  { cc: '33', nombre: 'Francia' },
  { cc: '39', nombre: 'Italia' },
  { cc: '49', nombre: 'Alemania' },
  { cc: '44', nombre: 'Reino Unido' },
  { cc: '90', nombre: 'Turquía' },
  { cc: '212', nombre: 'Marruecos' },
  { cc: '213', nombre: 'Argelia' },
  { cc: '20', nombre: 'Egipto' },
  { cc: '961', nombre: 'Líbano' },
  { cc: '963', nombre: 'Siria' },
  { cc: '962', nombre: 'Jordania' },
  { cc: '970', nombre: 'Palestina' },
  { cc: '966', nombre: 'Arabia Saudita' },
  { cc: '971', nombre: 'Emiratos Árabes' },
  { cc: '92', nombre: 'Pakistán' },
  { cc: '880', nombre: 'Bangladés' },
  { cc: '221', nombre: 'Senegal' },
]

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2025-05-02" -> "02/05/2025"; anything else as it came. */
export function fecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || ''
}

/** "2025-05-02" -> "2 de mayo de 2025". */
export function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : iso || ''
}

export function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Stored days ("lunes,viernes") as words; free text from the old form is shown as typed. */
export function diasTexto(v: string): string {
  if (!v) return ''
  const parts = v.split(',')
  return parts.every((d) => DIA_LABEL[d]) ? parts.map((d) => DIA_LABEL[d]).join(', ') : v
}

/** "Ahmad" -> "Sheij Ahmad", but a name already written "Sheij Ahmad" (or Sheikh, Jeque) stays as it is. */
export function conSheij(nombre: string): string {
  if (!nombre) return ''
  return /^(sheij|sheikh|sheik|shaij|jeque)\b/i.test(nombre.trim()) ? nombre : `Sheij ${nombre}`
}
