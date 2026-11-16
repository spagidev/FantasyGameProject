const CACHE = 'emberwake-v1';
const SHELL = ['/', '/index.html'];
const COLD = ['/assets/', '/art/', '/atlas/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  const isShell = url.pathname === '/' || url.pathname === '/index.html';
  const isCold = COLD.some((p) => url.pathname.startsWith(p));
  if (!isShell && !isCold) return;
  const key = isShell ? url.pathname : req;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(key);
      const fetched = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => hit || Response.error());
      if (!hit) return fetched;
      if (isShell) event.waitUntil(fetched);
      return hit;
    }),
  );
});
