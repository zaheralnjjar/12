export const REVIEW_FIELD_MAP: Record<string, string[]> = {
  'Sheij no reconocido': ['maestroId'],
  'Sin maestro asignado': ['maestroId'],
  'Fecha de shahada no reconocida': ['fechaShahada'],
  'Fecha de nacimiento no reconocida': ['fechaNacimiento'],
  'Nacionalidad no reconocida': ['nacionalidad'],
  'WhatsApp no reconocido': ['whatsapp', 'codigoPais'],
  'Documento no reconocido': ['tipoDocumento', 'numeroDocumento'],
  'Edad no reconocida': ['edadAlRegistro'],
}

export function reviewReasons(value: string): string[] {
  return value.split(' · ').map((reason) => reason.trim()).filter(Boolean)
}

export function reviewReasonType(reason: string): string {
  if (/^Posible duplicado de\s+/i.test(reason)) return 'Posible duplicado'
  const colon = reason.indexOf(':')
  return colon < 0 ? reason.trim() : reason.slice(0, colon).trim()
}

export function reviewCorrectionFields(reason: string): string[] {
  return REVIEW_FIELD_MAP[reviewReasonType(reason)] ?? []
}

export function duplicateTarget(reason: string): string | null {
  return reason.match(/^Posible duplicado de\s+([\w-]+)/i)?.[1] ?? null
}

export function groupReviewRecords<T extends { id: string; revisar: string }>(records: T[]) {
  const groups = new Map<string, T[]>()
  records.forEach((record) => {
    const firstReason = reviewReasons(record.revisar)[0]
    if (!firstReason) return
    const type = reviewReasonType(firstReason)
    groups.set(type, [...(groups.get(type) ?? []), record])
  })
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([reason, items]) => ({ reason, records: items }))
}
