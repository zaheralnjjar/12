// Registering a new person. For a colaborador this is the whole application: after sending,
// nothing of the record comes back and the form starts empty again.
import { useState } from 'react'
import { api } from '../api.ts'
import { ConversoForm } from '../components/ConversoForm.tsx'
import { emptyValues, toPayload, type FormValues } from '../lib/formValues.ts'
import { DocPicker } from '../components/DocPicker.tsx'
import { useAction } from '../lib/hooks.ts'
import type { Catalogo, DocAdjunto, Role } from '../types.ts'

export function RegistroScreen({ role, catalogo, onCreated }: { role: Role; catalogo: Catalogo; onCreated: (id: string) => void }) {
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [docs, setDocs] = useState<DocAdjunto[]>([])
  const [sent, setSent] = useState(false)
  const action = useAction()
  const campos = catalogo.campos.filter((c) => c.active)
  const lists = { nacionalidades: catalogo.nacionalidades.filter((n) => n.active).map((n) => n.nombre), maestros: catalogo.maestros.filter((m) => m.active) }

  if (sent) {
    return (
      <div className="stack">
        <p className="ok">La persona quedó registrada. Gracias.</p>
        {role === 'colaborador' && <p className="muted">Por privacidad, los datos enviados ya no se muestran en esta cuenta.</p>}
        <button className="primary big" onClick={() => { setValues(emptyValues()); setDocs([]); setSent(false); window.scrollTo(0, 0) }}>Registrar otra persona</button>
      </div>
    )
  }

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        action.run(async () => {
          const r = await api<{ registrado: boolean; id?: string }>('conversos.create', {
            data: toPayload(values),
            documentos: docs.map(({ tipo, dataUrl }) => ({ tipo, dataUrl })),
          })
          if (r.id) onCreated(r.id)
          else setSent(true)
        })
      }}
    >
      <h1>Registrar nuevo musulmán</h1>
      <p className="muted small">Los campos con <span className="req">*</span> son obligatorios.</p>
      <ConversoForm campos={campos} values={values} onChange={setValues} lists={lists} hide={role === 'maestro' ? ['maestroId'] : []} />
      <DocPicker docs={docs} onChange={setDocs} />
      {action.error && <p className="alert">{action.error}</p>}
      <button className="primary big" disabled={action.busy}>{action.busy ? 'Enviando…' : 'Registrar'}</button>
    </form>
  )
}
