import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage, getToken, setPreviewAs, setSessionEndHandler, setToken } from './api.ts'
import { Login } from './auth.tsx'
import { BottomNav, type Tab } from './components/BottomNav.tsx'
import { signOutGoogle } from './lib/googleSignOut.ts'
import { useLoad } from './lib/hooks.ts'
import { invitationToken } from './lib/invitationLink.ts'
import { clearSteps, goBack, pushStep } from './lib/nav.ts'
import { AjustesScreen } from './screens/AjustesScreen.tsx'
import { ConversoScreen } from './screens/ConversoScreen.tsx'
import { ConversosScreen, type Filtro } from './screens/ConversosScreen.tsx'
import { EnlacesScreen } from './screens/EnlacesScreen.tsx'
import { EstadisticasScreen } from './screens/EstadisticasScreen.tsx'
import { HomeScreen } from './screens/HomeScreen.tsx'
import { PerfilScreen } from './screens/PerfilScreen.tsx'
import { PendientesScreen } from './screens/PendientesScreen.tsx'
import { RevisionScreen } from './screens/RevisionScreen.tsx'
import { PublicRegistro } from './screens/PublicRegistro.tsx'
import { RegistroScreen } from './screens/RegistroScreen.tsx'
import type { Catalogo, MaestroRef, Me } from './types.ts'

type View =
  | { name: 'home' }
  | { name: 'conversos'; filtro?: Filtro }
  | { name: 'converso'; id: string }
  | { name: 'nuevo' }
  | { name: 'enlaces' }
  | { name: 'ajustes'; seccion?: string }
  | { name: 'perfil' }
  | { name: 'revision' }
  | { name: 'estadisticas' }
  | { name: 'pendientes' }

export default function App() {
  const token = invitationToken()
  if (token) return <PublicRegistro token={token} />
  return <SignedIn />
}

function SignedIn() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(!!getToken())
  const [notice, setNotice] = useState('')
  const [view, showView] = useState<View>({ name: 'home' })
  const viewRef = useRef(view)
  const [preview, setPreview] = useState<MaestroRef | null>(null)
  const [catKey, setCatKey] = useState(0)

  const show = useCallback((next: View) => {
    viewRef.current = next
    showView(next)
  }, [])
  /** Changes the screen and remembers the one left, so the back button returns to it. */
  const setView = useCallback((next: View) => {
    const prev = viewRef.current
    if (JSON.stringify(prev) === JSON.stringify(next)) return
    pushStep(() => show(prev))
    show(next)
  }, [show])

  const loadMe = useCallback(() => {
    api<Me>('me')
      .then((m) => { setMe(m); setNotice('') })
      .catch((e) => { setMe(null); setToken(null); setNotice(errorMessage(e)) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSessionEndHandler(() => {
      setMe(null)
      setNotice('La sesión terminó. Volvé a iniciar sesión.')
    })
    if (getToken()) loadMe()
  }, [loadMe])

  const onToken = useCallback((t: string) => {
    setToken(t)
    setLoading(true)
    loadMe()
  }, [loadMe])

  const role = preview ? 'maestro' : me?.user.role
  const catalogo = useLoad(() => (me ? api<Catalogo>('catalogo') : Promise.resolve(null)), `cat-${me?.user.email}-${catKey}-${preview?.id}`)

  const logout = () => {
    setPreviewAs(null)
    setPreview(null)
    signOutGoogle()
    setToken(null)
    setMe(null)
    setNotice('')
    clearSteps()
    show({ name: 'home' })
  }

  const startPreview = (m: MaestroRef) => {
    setPreviewAs(m.id)
    setPreview(m)
    clearSteps()
    show({ name: 'home' })
  }
  const stopPreview = () => {
    setPreviewAs(null)
    setPreview(null)
    clearSteps()
    show({ name: 'ajustes', seccion: 'maestros' })
  }

  if (loading) return <p className="muted center splash">Cargando…</p>
  if (!me) return <Login onToken={onToken} notice={notice} />
  if (catalogo.error) return <main className="stack"><p className="alert">{catalogo.error}</p><button onClick={catalogo.reload}>Reintentar</button><button className="ghost" onClick={logout}>Salir</button></main>
  if (!catalogo.data || !role) return <p className="muted center splash">Cargando…</p>
  const cat = catalogo.data

  const goTab = (t: Tab) => {
    if (t === 'conversos') setView({ name: 'conversos' })
    else if (t === 'ajustes') setView({ name: 'ajustes' })
    else if (t === 'nuevo') setView({ name: 'nuevo' })
    else if (t === 'enlaces') setView({ name: 'enlaces' })
    else if (t === 'perfil') setView({ name: 'perfil' })
    else if (t === 'pendientes') setView({ name: 'pendientes' })
    else setView({ name: 'home' })
  }
  const open = (id: string) => setView({ name: 'converso', id })
  const staff = role === 'supervisor' || role === 'maestro'

  let body
  if (role === 'colaborador') {
    body = <RegistroScreen role={role} catalogo={cat} onCreated={() => {}} />
  } else if (view.name === 'converso') {
    body = <ConversoScreen id={view.id} role={role} catalogo={cat} readOnly={!!preview} onDeleted={() => goBack(() => show({ name: 'conversos' }))} />
  } else if (view.name === 'conversos') {
    body = <ConversosScreen role={role} catalogo={cat} filtro={view.filtro} onOpen={open} />
  } else if (view.name === 'revision' && role === 'supervisor') {
    body = <RevisionScreen catalogo={cat} onOpen={open} onChanged={() => setCatKey((k) => k + 1)} />
  } else if (view.name === 'estadisticas' && staff) {
    body = <EstadisticasScreen onOpen={open} />
  } else if (view.name === 'pendientes' && staff) {
    body = <PendientesScreen onOpen={open} />
  } else if (view.name === 'nuevo' && !preview) {
    body = <RegistroScreen role={role} catalogo={cat} onCreated={(id) => id && show({ name: 'converso', id })} />
  } else if (view.name === 'enlaces') {
    body = <EnlacesScreen role={role} catalogo={cat} readOnly={!!preview} onOpen={open} />
  } else if (view.name === 'ajustes' && role === 'supervisor') {
    body = (
      <AjustesScreen
        seccion={view.seccion}
        catalogo={cat}
        onSeccion={(s) => setView({ name: 'ajustes', seccion: s })}
        onCatalogChanged={() => setCatKey((k) => k + 1)}
        onPreview={startPreview}
        onOpen={open}
      />
    )
  } else if (view.name === 'perfil' && role === 'maestro') {
    body = <PerfilScreen me={me} preview={preview} />
  } else {
    body = (
      <HomeScreen
        role={role}
        nombre={preview?.nombre || me.maestro?.nombre || ''}
        onOpen={open}
        onList={(filtro) => setView({ name: 'conversos', filtro })}
        onRevision={() => setView({ name: 'revision' })}
        onStats={() => setView({ name: 'estadisticas' })}
        onNuevo={() => setView({ name: 'nuevo' })}
      />
    )
  }

  const tab: Tab | null = view.name === 'converso' ? 'conversos' : view.name === 'home' || view.name === 'conversos' || view.name === 'nuevo' || view.name === 'enlaces' || view.name === 'ajustes' || view.name === 'perfil' || view.name === 'pendientes' ? view.name : null

  return (
    <div className="app">
      {preview && (
        <div className="card note row between" style={{ borderRadius: 0 }}>
          <span>Vista previa: ves la aplicación como <strong>{preview.nombre}</strong>. Solo lectura.</span>
          <button className="primary small" onClick={stopPreview}>Terminar vista previa</button>
        </div>
      )}
      <header className="topbar">
        {staff && view.name !== 'home' ? (
          <button className="ghost" onClick={() => goBack(() => show({ name: 'home' }))} aria-label="Volver">← Volver</button>
        ) : (
          <span className="brand">{me.org || 'Nuevo Musulmán'}</span>
        )}
        <button className="ghost" onClick={logout}>Salir</button>
      </header>
      <main>{body}</main>
      {staff && <BottomNav role={role} active={tab} onGo={goTab} />}
      <footer className="muted center small" dir="ltr" style={{ padding: 6 }}>{me.user.email}</footer>
    </div>
  )
}
