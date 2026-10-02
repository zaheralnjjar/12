import { api } from '../api.ts'
import { SignaturePad } from '../components/SignaturePad.tsx'
import { useLoad } from '../lib/hooks.ts'
import type { MaestroRef, Me } from '../types.ts'

export function PerfilScreen({ me, preview }: { me: Me; preview: MaestroRef | null }) {
  const maestroId = preview?.id || me.maestro?.id || ''
  const firma = useLoad(() => api<{ dataUrl: string | null }>('firma.get', { maestroId }), `firma-${maestroId}`)
  return (
    <div className="stack">
      <h1>{preview?.nombre || me.maestro?.nombre}</h1>
      <p className="muted" dir="ltr" style={{ textAlign: 'start' }}>{me.user.email}</p>
      <section className="card stack">
        <h2>Mi firma</h2>
        <p className="muted small">Se imprime en los certificados que emitís a tu nombre.</p>
        {firma.error && <p className="alert">{firma.error}</p>}
        {firma.data && !preview && (
          <SignaturePad current={firma.data.dataUrl} onSave={async (dataUrl) => { await api('firma.save', { maestroId, dataUrl }); firma.reload() }} />
        )}
        {firma.data && preview && (firma.data.dataUrl ? <div className="sig-preview"><img src={firma.data.dataUrl} alt="Firma" /></div> : <p className="muted">Sin firma.</p>)}
      </section>
    </div>
  )
}
