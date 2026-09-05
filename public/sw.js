/**
 * Just enough service worker to make Nook open on a phone with no signal.
 *
 * Two rules, and the split matters:
 *
 *  - /assets/* filenames contain a content hash, so they can never change
 *    under us. Cache-first: instant, offline, no staleness possible.
 *  - the page itself has no hash, so network-first with the cache as a
 *    fallback. That way a deploy is picked up the moment there's a signal,
 *    and a tunnel still gets you your planner.
 *
 * Everything else — the Google Calendar API, the weather — is never cached.
 * Stale calendar data pretending to be live is worse than no calendar data.
 */
const CACHE = 'nook-shell-v1';
const SHELL = ['/', '/icon-180.png', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .catch(() => {})            // a failed precache shouldn't block install
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isHashedAsset = (url) => url.pathname.startsWith('/assets/');
const isFontFile = (url) => url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // hashed bundles and font files never change: serve from the cache
  if ((sameOrigin && isHashedAsset(url)) || isFontFile(url)) {
    event.respondWith(
      caches.match(request).then((hit) => hit ?? fetch(request).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })),
    );
    return;
  }

  // the page: fresh if we can, cached if we can't
  if (request.mode === 'navigate' || (sameOrigin && url.pathname === '/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit ?? new Response(
          '<h1>Nook is offline</h1><p>Open it once with a signal and it will work without one.</p>',
          { headers: { 'Content-Type': 'text/html' }, status: 503 },
        ))),
    );
  }

  // anything else (APIs, images from the web) goes straight to the network
});
