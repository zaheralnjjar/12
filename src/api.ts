// The only place that talks to the server.
const API_URL = import.meta.env.VITE_API_URL as string | undefined
const TOKEN_KEY = 'nm.token'

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

let onSessionEnd: (() => void) | null = null
export function setSessionEndHandler(fn: () => void) {
  onSessionEnd = fn
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private browsing: the session simply lasts until the tab closes
  }
}

/** Supervisor preview: every call is made as this maestro, read-only (the server refuses writes). */
let previewAs: string | null = null
export function setPreviewAs(id: string | null) {
  previewAs = id
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  if (!API_URL) throw new ApiError('NOT_CONFIGURED', 'Todavía no se configuró la dirección del servidor')
  let res: Response
  try {
    // text/plain keeps it a "simple" request: Apps Script cannot answer CORS preflights
    res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
  } catch {
    throw new ApiError('NETWORK', 'No hay conexión. Revisá internet e intentá de nuevo.')
  }
  let out: { ok: boolean; data?: T; error?: { code: string; message: string } }
  try {
    out = await res.json()
  } catch {
    throw new ApiError('SERVER', 'Respuesta inesperada del servidor. Intentá de nuevo.')
  }
  if (!out.ok) {
    const err = out.error ?? { code: 'SERVER', message: 'Ocurrió un error' }
    throw new ApiError(err.code, err.message)
  }
  return out.data as T
}

export async function api<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  try {
    return await post<T>({ token: getToken(), action, payload, ...(previewAs ? { asMaestro: previewAs } : {}) })
  } catch (e) {
    if (e instanceof ApiError && e.code === 'UNAUTHENTICATED') {
      setToken(null)
      onSessionEnd?.()
    }
    throw e
  }
}

/** The one-time registration link: no sign-in, no token of ours is ever sent. */
export function publicApi<T>(action: 'public.form' | 'public.submit' | 'public.verify', payload: Record<string, unknown>): Promise<T> {
  return post<T>({ action, payload })
}

export function errorMessage(e: unknown): string {
  const message = e instanceof Error ? e.message : 'Ocurrió un error inesperado'
  if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message)) {
    return 'La aplicación se actualizó. Volvé a cargar la página e intentá de nuevo.'
  }
  return message
}
