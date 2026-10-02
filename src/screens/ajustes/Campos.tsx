// The fields of a record: which built-in ones are required, shown in the personal link or in use,
// and the supervisor's own fields (a fiqh topic to explain, a cultural detail, anything a case needs).
import { useState } from 'react'
import { api } from '../../api.ts'
import { useAction } from '../../lib/hooks.ts'
import { SECCIONES, SECCION_LABEL, TIPO_CAMPO_LABEL } from '../../lib/labels.ts'
import type { Campo, Catalogo } from '../../types.ts'

type Edit = { id?: string; etiqueta: string; etiquetaAr: string; tipo: string; opciones: string; ayuda: string; seccion: string; requerido: boolean; enEnlace: boolean; active: boolean }
const nuevo = (): Edit => ({ etiqueta: '', etiquetaAr: '', tipo: 'text', opciones: '', ayuda: '', seccion: 'otros', requerido: false, enEnlace: false, active: true })

export function Campos({ catalogo, onChanged }: { catalogo: Catalogo; onChanged: () => void }) {
  const [edit, setEdit] = useState<Edit | null>(null)
  const action = useAction()
  const base = catalogo.campos.filter((c) => !c.custom)
  const propios = catalogo.campos.filter((c) => c.custom)

  const toggleBase = (c: Campo, patch: Partial<Pick<Campo, 'requerido' | 'enEnlace' | 'active'>>) => {
    const next = { requerido: c.requerido, enEnlace: c.enEnlace, active: c.active, ...patch }
    if (!next.active) { next.requerido = false; next.enEnlace = false }
    action.run(async () => { await api('camposBase.save', { key: c.key, ...next }); onChanged() })
  }

  return (
    <div className="stack">
      <h1>Campos del registro</h1>
      <p className="muted small">«En uso» lo muestra en los formularios; «Obligatorio» no deja registrar sin completarlo; «En el enlace» lo pide en el enlace personal que se manda por WhatsApp.</p>
      {action.error && <p className="alert">{action.error}</p>}

      <section className="card stack">
        <h2>Campos básicos</h2>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Campo</th><th>En uso</th><th>Obligatorio</th><th>En el enlace</th></tr></thead>
            <tbody>
              {base.map((c) => (
                <tr key={c.key}>
                  <td>{c.etiqueta}<div className="muted small">{SECCION_LABEL[c.seccion]}</div></td>
                  <td><input type="checkbox" aria-label={`${c.etiqueta}: en uso`} checked={c.active} disabled={c.fixed || action.busy} onChange={(e) => toggleBase(c, { active: e.target.checked })} /></td>
                  <td><input type="checkbox" aria-label={`${c.etiqueta}: obligatorio`} checked={c.requerido} disabled={c.fixed || !c.active || action.busy} onChange={(e) => toggleBase(c, { requerido: e.target.checked })} /></td>
                  <td>{c.internal ? <span className="muted small">nunca</span> : <input type="checkbox" aria-label={`${c.etiqueta}: en el enlace`} checked={c.enEnlace} disabled={c.fixed || !c.active || action.busy} onChange={(e) => toggleBase(c, { enEnlace: e.target.checked })} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card stack">
        <div className="section-title"><h2>Campos propios</h2>{!edit && <button className="primary small" onClick={() => setEdit(nuevo())}>+ Agregar campo</button>}</div>
        <p className="muted small">Para lo que haga falta en cada caso: un tema de fiqh que se explicó, un dato cultural, el idioma… El texto de ayuda aparece debajo del campo. Un campo no se borra: se deja de usar.</p>
        {edit && (
          <form className="stack" onSubmit={(e) => {
            e.preventDefault()
            action.run(async () => {
              await api('campos.save', { ...edit, opciones: edit.opciones.split('\n').map((o) => o.trim()).filter(Boolean) })
              setEdit(null)
              onChanged()
            })
          }}>
            <div className="two">
              <label className="stack"><span>Etiqueta (español) <span className="req">*</span></span><input required value={edit.etiqueta} onChange={(e) => setEdit({ ...edit, etiqueta: e.target.value })} /></label>
              <label className="stack"><span>Etiqueta en árabe (para exportar)</span><input dir="rtl" value={edit.etiquetaAr} onChange={(e) => setEdit({ ...edit, etiquetaAr: e.target.value })} /></label>
            </div>
            <div className="two">
              <label className="stack"><span>Tipo</span>
                <select value={edit.tipo} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}>
                  {Object.entries(TIPO_CAMPO_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="stack"><span>Sección</span>
                <select value={edit.seccion} onChange={(e) => setEdit({ ...edit, seccion: e.target.value })}>
                  {SECCIONES.map((s) => <option key={s} value={s}>{SECCION_LABEL[s]}</option>)}
                </select>
              </label>
            </div>
            {(edit.tipo === 'choice' || edit.tipo === 'multichoice') && (
              <label className="stack"><span>Opciones (una por línea)</span><textarea value={edit.opciones} onChange={(e) => setEdit({ ...edit, opciones: e.target.value })} /></label>
            )}
            <label className="stack"><span>Texto de ayuda / explicación</span><textarea value={edit.ayuda} maxLength={2000} onChange={(e) => setEdit({ ...edit, ayuda: e.target.value })} /></label>
            <label className="check"><input type="checkbox" checked={edit.requerido} onChange={(e) => setEdit({ ...edit, requerido: e.target.checked })} /><span>Obligatorio</span></label>
            <label className="check"><input type="checkbox" checked={edit.enEnlace} onChange={(e) => setEdit({ ...edit, enEnlace: e.target.checked })} /><span>Pedirlo también en el enlace personal</span></label>
            <label className="check"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /><span>En uso</span></label>
            <div className="row"><button className="primary" disabled={action.busy}>Guardar</button><button type="button" onClick={() => setEdit(null)}>Cancelar</button></div>
          </form>
        )}
        {propios.length === 0 && !edit && <p className="muted">Todavía no hay campos propios.</p>}
        <ul className="list">
          {propios.map((c) => (
            <li key={c.key} className={c.active ? 'row between' : 'row between inactive'}>
              <span className="stack tight">
                <strong>{c.etiqueta}</strong>
                <span className="muted small">{TIPO_CAMPO_LABEL[c.tipo]} · {SECCION_LABEL[c.seccion]}{c.requerido ? ' · obligatorio' : ''}{c.enEnlace ? ' · en el enlace' : ''}{c.active ? '' : ' · sin usar'}</span>
              </span>
              <button className="small" onClick={() => setEdit({ id: c.key, etiqueta: c.etiqueta, etiquetaAr: c.etiquetaAr === c.etiqueta ? '' : c.etiquetaAr, tipo: c.tipo, opciones: c.opciones.join('\n'), ayuda: c.ayuda, seccion: c.seccion, requerido: c.requerido, enEnlace: c.enEnlace, active: c.active })}>Editar</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
