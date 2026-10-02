import { publicApi } from '../api.ts'
import { useLoad } from '../lib/hooks.ts'
import { LanguageSwitcher, T } from '../lib/i18n.tsx'

type Verification = { numero: string; estado: 'válida' | 'anulada'; fecha: string }

export function PublicVerify({ token }: { token: string }) {
  const result = useLoad(() => publicApi<Verification>('public.verify', { token }), `public-verify-${token}`)
  return (
    <div className="public">
      <header><LanguageSwitcher /><h1><T>Verificación de certificado</T></h1></header>
      <main className="stack">
        {result.error && <p className="alert"><T>No se pudo verificar este certificado. El código puede ser incorrecto o no estar vigente.</T></p>}
        {!result.data && !result.error && <p className="muted center"><T>Verificando…</T></p>}
        {result.data && (
          <section className="card stack">
            <h2><T>Certificado N.º </T>{result.data.numero}</h2>
            <p><T>Estado: </T><strong><T>{result.data.estado === 'válida' ? 'Válido' : 'Anulado'}</T></strong></p>
            <p><T>Fecha de emisión: </T><strong>{result.data.fecha}</strong></p>
          </section>
        )}
      </main>
    </div>
  )
}
