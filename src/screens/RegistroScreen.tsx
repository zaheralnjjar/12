// Registering a new person. For a colaborador this is the whole application: after sending,
// nothing of the record comes back and the form starts empty again.
import { useState } from 'react'
import { api } from '../api.ts'
import { ConversoForm } from '../components/ConversoForm.tsx'
import { emptyValues, toPayload, type FormValues } from '../lib/formValues.ts'
import { DocPicker } from '../components/DocPicker.tsx'
import { useAction } from '../lib/hooks.ts'
import type { Catalogo, DocAdjunto, Role } from '../types.ts'
import { T } from '../lib/i18n.tsx'

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
        <p className="ok"><T>La persona quedó registrada. Gracias.</T></p>
        {role === 'colaborador' && <p className="muted"><T>Por privacidad, los datos enviados ya no se muestran en esta cuenta.</T></p>}
        <button className="primary big" onClick={() => { setValues(emptyValues()); setDocs([]); setSent(false); window.scrollTo(0, 0) }}><T>Registrar otra persona</T></button>
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
      <h1><T>Registrar nuevo musulmán</T></h1>
      <p className="muted small"><T>Los campos con </T><span className="req"><T>*</T></span> <T> <T> son obligatorios.</T></T></p>
      <ConversoForm campos={campos} values={values} onChange={setValues} lists={lists} hide={role === 'maestro' ? ['maestroId'] : []} />
      <DocPicker docs={docs} onChange={setDocs} />
      {action.error && <p className="alert"><T>{action.error}</T></p>}
      <button className="primary big" disabled={action.busy}><T>{action.busy ? 'Enviando…' : 'Registrar'}</T></button>
    </form>
  )
}
