// The one-time registration link: <app address>#r=<token>. The part after # never reaches any server log.
// It is read once when the page opens and removed from the address bar so it is not left in history.
const TOKEN = /^[a-f0-9]{64}$/

function read(): string {
  const m = /^#r=([^&]*)/.exec(window.location.hash)
  return m && TOKEN.test(m[1]) ? m[1] : ''
}

const token = typeof window !== 'undefined' ? read() : ''
if (token) window.history.replaceState(null, '', window.location.pathname + window.location.search)

/** The token the page was opened with, if any. */
export function invitationToken(): string {
  return token
}
