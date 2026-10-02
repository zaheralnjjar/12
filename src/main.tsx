import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// A tab opened before a new version was published asks for files that no longer exist. Reload once.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    if (sessionStorage.getItem('nm.reloaded') === '1') return
    sessionStorage.setItem('nm.reloaded', '1')
  } catch { /* private mode: reload anyway */ }
  window.location.reload()
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
