// Caches the app shell only, so the installed app opens instantly.
// API calls (another origin, POST) are never cached: data always comes from the server.
const CACHE = 'nm-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  const put = (res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
    return res
  }
  if (req.mode === 'navigate') {
    // network first, so a new version is picked up as soon as there is a connection
    event.respondWith(fetch(req).then(put).catch(() => caches.match(req).then((r) => r || caches.match('/'))))
    return
  }
  // hashed assets and icons: cache first
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put)))
})
