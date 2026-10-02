// Sign-in screen. Production: Google Sign-In only. The e-mail box below exists
// only in `npm run dev` builds against the local dev server (it is compiled out of production).
import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const DEV_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN === '1'

type GoogleId = {
  initialize(opts: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean }): void
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void
  prompt(): void
  disableAutoSelect(): void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client?hl=es'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('No se pudo cargar el inicio de sesión de Google. Revisá internet.'))
    document.head.appendChild(s)
  })
}

const DEV_ACCOUNTS: [string, string][] = [
  ['Supervisor', 'supervisor.demo@example.com'],
  ['Sheij 1', 'maestro.uno@example.com'],
  ['Colaborador', 'colaborador.demo@example.com'],
]

export function Login({ onToken, notice }: { onToken: (token: string) => void; notice?: string }) {
  const btn = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(DEV_LOGIN || CLIENT_ID ? '' : 'La aplicación todavía no está configurada (falta el identificador de inicio de sesión).')
  const [devEmail, setDevEmail] = useState(DEV_LOGIN ? DEV_ACCOUNTS[0][1] : '')

  useEffect(() => {
    if (DEV_LOGIN || !CLIENT_ID) return
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !btn.current) return
        const id = window.google!.accounts.id
        id.initialize({ client_id: CLIENT_ID, callback: (r) => onToken(r.credential), auto_select: true })
        id.renderButton(btn.current, { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es', width: 280 })
        id.prompt()
      })
      .catch((e: Error) => setError(e.message))
    return () => {
      cancelled = true
    }
  }, [onToken])

  return (
    <main className="login">
      <img src="/icons/icon.svg" alt="" width={88} height={88} />
      <h1>Nuevo Musulmán</h1>
      <p className="muted">Ingresá con la cuenta de Google registrada por el supervisor</p>
      {notice && <p className="alert">{notice}</p>}
      {error && <p className="alert">{error}</p>}
      {DEV_LOGIN ? (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); onToken('dev.' + devEmail.trim().toLowerCase()) }}>
          <p className="badge warn">Modo de prueba local — datos ficticios</p>
          <input dir="ltr" value={devEmail} onChange={(e) => setDevEmail(e.target.value)} aria-label="Correo" />
          <div className="row" style={{ justifyContent: 'center' }}>
            {DEV_ACCOUNTS.map(([l, e]) => <button type="button" key={e} className="small" onClick={() => setDevEmail(e)}>{l}</button>)}
          </div>
          <button className="primary">Entrar (prueba)</button>
        </form>
      ) : (
        <div ref={btn} className="google-btn" />
      )}
    </main>
  )
}
