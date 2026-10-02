// The fields of a record, drawn from the configuration the supervisor keeps in Ajustes.
// Used inside the app (registering, editing) and on the public one-time link page.
import type { CampoPublico, ExtraValue, MaestroRef } from '../types.ts'
import { DIA_LABEL, PAISES, SECCIONES, SECCION_LABEL, SEXO_LABEL } from '../lib/labels.ts'

import type { FormValues } from '../lib/formValues.ts'
import { T } from '../lib/i18n.tsx'
import { useLocale } from '../lib/locale-context.ts'

export type Lists = { nacionalidades: string[]; maestros: MaestroRef[] }

function Label({ campo }: { campo: CampoPublico }) {
  const { t } = useLocale()
  return (
    <span>
      {campo.custom ? campo.etiqueta : <T>{campo.etiqueta}</T>} {campo.requerido && <span className="req" aria-label={t('obligatorio')}><T>*</T></span>}
    </span>
  )
}

function FieldInput({
  campo,
  value,
  onChange,
  values,
  setData,
  lists,
}: {
  campo: CampoPublico
  value: ExtraValue
  onChange: (v: ExtraValue) => void
  values: FormValues
  setData: (key: string, v: string) => void
  lists: Lists
}) {
  const { t } = useLocale()
  const text = typeof value === 'string' ? value : ''
  const help = campo.ayuda ? <span className="help pre">{campo.ayuda}</span> : null
  const req = campo.requerido

  switch (campo.tipo) {
    case 'textarea':
      return (
        <label className="stack">
          <Label campo={campo} />
          {help}
          <textarea value={text} onChange={(e) => onChange(e.target.value)} required={req} maxLength={5000} />
        </label>
      )
    case 'date':
      return (
        <label className="stack">
          <Label campo={campo} />
          {help}
          <input type="date" value={text} onChange={(e) => onChange(e.target.value)} required={req} />
        </label>
      )
    case 'number':
      return (
        <label className="stack">
          <Label campo={campo} />
          {help}
          <input type="number" inputMode="numeric" value={text} onChange={(e) => onChange(e.target.value)} required={req} />
        </label>
      )
    case 'email':
      return (
        <label className="stack">
          <Label campo={campo} />
          <input type="email" dir="ltr" value={text} onChange={(e) => onChange(e.target.value)} required={req} autoComplete="email" />
        </label>
      )
    case 'sexo':
      return (
        <label className="stack">
          <Label campo={campo} />
          {help}
          <select value={text} onChange={(e) => onChange(e.target.value)} required={req}>
            <option value=""><T>—</T></option>
            {Object.entries(SEXO_LABEL).map(([k, l]) => <option key={k} value={k}><T>{l}</T></option>)}
          </select>
        </label>
      )
    case 'nacionalidad': {
      const opts = lists.nacionalidades.includes(text) || !text ? lists.nacionalidades : [text, ...lists.nacionalidades]
      return (
        <label className="stack">
          <Label campo={campo} />
          <select value={text} onChange={(e) => onChange(e.target.value)} required={req}>
            <option value=""><T>—</T></option>
            {opts.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )
    }
    case 'tipoDocumento':
      return (
        <label className="stack">
          <Label campo={campo} />
          <select value={text} onChange={(e) => onChange(e.target.value)} required={req}>
            <option value=""><T>—</T></option>
            <option value="DNI"><T>DNI</T></option>
            <option value="Pasaporte"><T>Pasaporte</T></option>
            <option value="Otro"><T>Otro</T></option>
          </select>
        </label>
      )
    case 'maestro': {
      const active = lists.maestros.filter((m) => m.active || m.id === text)
      return (
        <label className="stack">
          <Label campo={campo} />
          <select value={text} onChange={(e) => onChange(e.target.value)} required={req}>
            <option value=""><T>—</T></option>
            {active.map((m) => <option key={m.id} value={m.id}>{m.nombre}{m.active ? '' : ' (inactivo)'}</option>)}
          </select>
        </label>
      )
    }
    case 'phone':
      return (
        <label className="stack">
          <Label campo={campo} />
          <div className="phone">
            <select aria-label={t('Código de país')} value={values.data.codigoPais || '54'} onChange={(e) => setData('codigoPais', e.target.value)}>
              {PAISES.map((p) => <option key={p.cc} value={p.cc}><T>{p.nombre}</T> +{p.cc}</option>)}
            </select>
            <input type="tel" inputMode="tel" dir="ltr" value={text} onChange={(e) => onChange(e.target.value)} required={req} placeholder="11 2345 6789" autoComplete="tel" />
          </div>
          <span className="help"><T>Si el número no es de Argentina, elegí el país. También podés escribirlo completo con «+».</T></span>
        </label>
      )
    case 'dias': {
      const sel = text ? text.split(',') : []
      const known = sel.every((d) => DIA_LABEL[d])
      return (
        <div className="stack tight">
          <Label campo={campo} />
          {help}
          {!known && <span className="help"><T>Respuesta anterior: «</T>{text}<T>». Elegí los días para reemplazarla.</T></span>}
          <div className="chips">
            {Object.entries(DIA_LABEL).map(([k, l]) => {
              const on = known && sel.includes(k)
              return (
                <button type="button" key={k} className="chip-toggle" aria-pressed={on}
                  onClick={() => {
                    const base = known ? sel : []
                    const next = on ? base.filter((d) => d !== k) : [...base, k]
                    onChange(Object.keys(DIA_LABEL).filter((d) => next.includes(d)).join(','))
                  }}>
                  <T>{l}</T>
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    case 'yesno':
      return (
        <div className="stack tight">
          <label className="check">
            <input type="checkbox" checked={text === '1'} onChange={(e) => onChange(e.target.checked ? '1' : '')} />
            <Label campo={campo} />
          </label>
          {help}
        </div>
      )
    case 'choice':
      return (
        <label className="stack">
          <Label campo={campo} />
          {help}
          <select value={text} onChange={(e) => onChange(e.target.value)} required={req}>
            <option value=""><T>—</T></option>
            {campo.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      )
    case 'multichoice': {
      const arr = Array.isArray(value) ? value : value ? [value] : []
      return (
        <div className="stack tight">
          <Label campo={campo} />
          {help}
          {campo.opciones.map((o) => (
            <label className="check" key={o}>
              <input type="checkbox" checked={arr.includes(o)} onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )
    }
    default:
      return (
        <label className="stack">
          <Label campo={campo} />
          {help}
          <input value={text} onChange={(e) => onChange(e.target.value)} required={req} maxLength={campo.custom ? 300 : 120} />
        </label>
      )
  }
}

/** All the given fields, grouped by section. `hide` leaves out keys the screen fills by itself. */
export function ConversoForm({
  campos,
  values,
  onChange,
  lists,
  hide = [],
}: {
  campos: CampoPublico[]
  values: FormValues
  onChange: (v: FormValues) => void
  lists: Lists
  hide?: string[]
}) {
  const visible = campos.filter((c) => !hide.includes(c.key))
  const setData = (key: string, v: string) => onChange({ ...values, data: { ...values.data, [key]: v } })
  return (
    <div className="stack">
      {SECCIONES.map((sec) => {
        const here = visible.filter((c) => (c.seccion || 'otros') === sec)
        if (!here.length) return null
        return (
          <fieldset key={sec}>
            <legend><T>{SECCION_LABEL[sec]}</T></legend>
            {here.map((c) => (
              <FieldInput
                key={c.key}
                campo={c}
                value={c.custom ? values.extra[c.key] ?? '' : values.data[c.key] ?? ''}
                onChange={(v) =>
                  c.custom
                    ? onChange({ ...values, extra: { ...values.extra, [c.key]: v } })
                    : onChange({ ...values, data: { ...values.data, [c.key]: typeof v === 'string' ? v : v.join(',') } })
                }
                values={values}
                setData={setData}
                lists={lists}
              />
            ))}
          </fieldset>
        )
      })}
    </div>
  )
}
