export function reviewReasons(value: string): string[] {
  return value.split(' · ').map((reason) => reason.trim()).filter(Boolean)
}

export function duplicateTarget(reason: string): string | null {
  return reason.match(/Posible duplicado de\s+([\w-]+)/i)?.[1] ?? null
}

export function groupReviewRecords<T extends { id: string; revisar: string }>(records: T[]) {
  const groups = new Map<string, T[]>()
  records.forEach((record) => reviewReasons(record.revisar).forEach((reason) => {
    groups.set(reason, [...(groups.get(reason) ?? []), record])
  }))
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([reason, items]) => ({ reason, records: items }))
}
