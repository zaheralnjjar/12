import { publicApi } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'

type Verification = { numero: string; estado: 'válida' | 'anulada'; fecha: string }

export function PublicVerify({ token }: { token: string }) {
  const result = useLoad(() => publicApi<Verification>('public.verify', { token }), `public-verify-${token}`)
  return (
    <div className="public">
      <header><h1>Verificación de certificado</h1></header>
      <main className="stack">
        {result.error && <p className="alert">No se pudo verificar este certificado. El código puede ser incorrecto o no estar vigente.</p>}
        {!result.data && !result.error && <p className="muted center">Verificando…</p>}
        {result.data && (
          <section className="card stack">
            <h2>Certificado N.º {result.data.numero}</h2>
            <p>Estado: <strong>{result.data.estado === 'válida' ? 'Válido' : 'Anulado'}</strong></p>
            <p>Fecha de emisión: <strong>{result.data.fecha}</strong></p>
          </section>
        )}
      </main>
    </div>
  )
}
