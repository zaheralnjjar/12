// Identity documents attached while registering (before the record exists). Images are shrunk in the browser.
import { useState } from 'react'
import { errorMessage } from '../api.ts'
import { DOC_LABEL } from '../lib/labels.ts'
import { prepareDocument } from '../lib/imageResize.ts'
import type { DocAdjunto } from '../types.ts'

export const MAX_DOCS = 4

export function DocPicker({ docs, onChange }: { docs: DocAdjunto[]; onChange: (d: DocAdjunto[]) => void }) {
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
      <legend>Documentos (opcional)</legend>
      <p className="help">Foto del DNI o del pasaporte. Se guardan en privado y solo los ven el supervisor y el sheij asignado.</p>
      {docs.length > 0 && (
        <ul className="list">
          {docs.map((d, i) => (
            <li key={i} className="row between">
              <span>{DOC_LABEL[d.tipo]} · <span className="muted small">{d.nombre}</span></span>
              <button type="button" className="small" onClick={() => onChange(docs.filter((_, j) => j !== i))}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      {docs.length < MAX_DOCS && (
        <div className="row">
          <select aria-label="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: 'auto' }}>
            {Object.entries(DOC_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <label className="button">
            {busy ? 'Preparando…' : 'Elegir archivo o sacar foto'}
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
      )}
      {error && <p className="alert">{error}</p>}
    </fieldset>
  )
}
