const TOKEN = /^[a-f0-9]{64}$/
const params = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search)
const requested = !!params && (params.has('verify') || params.has('numero'))
const raw = params?.get('verify') || ''
const token = TOKEN.test(raw) ? raw : ''

if (requested && typeof window !== 'undefined') window.history.replaceState(null, '', window.location.pathname + window.location.hash)

export function verificationRequest(): { token: string } | null {
  return requested ? { token } : null
}
