import type { ExtraValue } from '../types.ts'

/** What a record form holds: built-in fields as text, custom answers apart. */
export type FormValues = { data: Record<string, string>; extra: Record<string, ExtraValue> }

export const emptyValues = (): FormValues => ({ data: { codigoPais: '54' }, extra: {} })

/** Builds the payload the server expects: built-in fields at the top level, custom answers in `extra`. */
export function toPayload(v: FormValues): Record<string, unknown> {
  return { ...v.data, extra: v.extra }
}
