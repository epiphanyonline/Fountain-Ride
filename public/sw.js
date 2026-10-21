const CACHE='fountain-ride-shell-v1';
const SHELL=['/','/book','/rider','/manifest.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(r=>{const clone=r.clone();caches.open(CACHE).then(c=>c.put(event.request,clone)).catch(()=>{});return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('/'))))});
