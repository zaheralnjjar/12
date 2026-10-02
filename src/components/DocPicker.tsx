// Identity documents attached while registering (before the record exists). Images are shrunk in the browser.
import { useState } from 'react'
import { errorMessage } from '../api.ts'
import { DOC_LABEL } from '../lib/labels.ts'
import { prepareDocument } from '../lib/imageResize.ts'
import type { DocAdjunto } from '../types.ts'
import { T, useLocale } from '../lib/i18n.tsx'

export const MAX_DOCS = 4

export function DocPicker({ docs, onChange }: { docs: DocAdjunto[]; onChange: (d: DocAdjunto[]) => void }) {
  const { t } = useLocale()
  const [tipo, setTipo] = useState('dni_frente')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const { dataUrl } = await prepareDocument(file)
      onChange([...docs, { tipo, dataUrl, nombre: file.name }])
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <fieldset>
      <legend><T>Documentos (opcional)</T></legend>
      <p className="help"><T>Foto del DNI o del pasaporte. Se guardan en privado y solo los ven el supervisor y el sheij asignado.</T></p>
      {docs.length > 0 && (
        <ul className="list">
          {docs.map((d, i) => (
            <li key={i} className="row between">
              <span><T>{DOC_LABEL[d.tipo]}</T> · <span className="muted small">{d.nombre}</span></span>
              <button type="button" className="small" onClick={() => onChange(docs.filter((_, j) => j !== i))}><T>Quitar</T></button>
            </li>
          ))}
        </ul>
      )}
      {docs.length < MAX_DOCS && (
        <div className="row">
          <select aria-label={t('Tipo de documento')} value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 'auto' }}>
            {Object.entries(DOC_LABEL).map(([k, l]) => <option key={k} value={k}><T>{l}</T></option>)}
          </select>
          <label className="button">
            <T>{busy ? 'Preparando…' : 'Elegir archivo o sacar foto'}</T>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
      )}
      {error && <p className="alert">{error}</p>}
    </fieldset>
  )
}
