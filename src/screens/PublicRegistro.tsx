// The page behind a one-time link. No account and no access to anything else: it shows the fields the
// supervisor marked for the link, sends them once, and the link stops working.
import { useState } from 'react'
import { publicApi } from '../api.ts'
import { ConversoForm } from '../components/ConversoForm.tsx'
import { emptyValues, toPayload, type FormValues } from '../lib/formValues.ts'
import { DocPicker } from '../components/DocPicker.tsx'
import { useAction, useLoad } from '../lib/hooks.ts'
import type { DocAdjunto, FormularioPublico } from '../types.ts'

export function PublicRegistro({ token }: { token: string }) {
  const form = useLoad(() => publicApi<FormularioPublico>('public.form', { token }), 'public-form')
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [docs, setDocs] = useState<DocAdjunto[]>([])
  const [sent, setSent] = useState(false)
  const action = useAction()

  return (
    <div className="public">
      <header>
        <img src="/icons/icon.svg" alt="" width={64} height={64} style={{ alignSelf: 'center' }} />
        <h1>{form.data?.org || 'Nuevo Musulmán'}</h1>
        {!sent && form.data && <p className="muted">Assalamu alaikum. Completá tus datos para que podamos acompañarte. Solo los verá el equipo del centro.</p>}
      </header>
      <main className="stack">
        {form.error && <p className="alert">{form.error}</p>}
        {!form.data && !form.error && <p className="muted center">Cargando…</p>}
        {sent && <p className="ok center">¡Gracias! Recibimos tus datos. Que Allah te bendiga.</p>}
        {form.data && !sent && (
          <form className="stack" onSubmit={(e) => {
            e.preventDefault()
            action.run(async () => {
              await publicApi('public.submit', { token, data: toPayload(values), documentos: docs.length ? docs.map(({ tipo, dataUrl }) => ({ tipo, dataUrl })) : undefined })
              setSent(true)
              window.scrollTo(0, 0)
            })
          }}>
            <ConversoForm campos={form.data.campos} values={values} onChange={setValues} lists={{ nacionalidades: form.data.nacionalidades, maestros: [] }} />
            {form.data.documentos && <DocPicker docs={docs} onChange={setDocs} />}
            {action.error && <p className="alert">{action.error}</p>}
            <button className="primary big" disabled={action.busy}>{action.busy ? 'Enviando…' : 'Enviar mis datos'}</button>
            <p className="help center">Tus datos se usan solo para el acompañamiento del centro y no se comparten.</p>
          </form>
        )}
      </main>
    </div>
  )
}
