// Cache only immutable/static image or framework assets.
// Never cache booking details, accounts, admin pages, authenticated APIs or money.
const STATIC_CACHE = 'fountain-ride-static-v2'
const OLD_PREFIXES = ['fountain-ride-shell-']

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(keys.filter((key) =>
        key !== STATIC_CACHE && OLD_PREFIXES.some((prefix) => key.startsWith(prefix))
      ).map((key) => caches.delete(key)))
      await self.clients.claim()
    })
  )
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || request.mode === 'navigate') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  const staticAsset =
    url.pathname.startsWith('/_next/static/') ||
    /^\/(?:icon-(?:192|512)\.png|fountain-ride-mark\.svg)$/.test(url.pathname)
  if (!staticAsset) return
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone())
      }
      return response
    })
  )
})
