/* global self, clients, caches, fetch */

// RepLab service worker.
// Registered at /sw.js with scope '/' so it controls the whole app.
// Three concerns:
//   1. Web-push receive + notificationclick (Phase 3A).
//   2. Runtime caching for offline survival of the workout player and other
//      authenticated surfaces (Phase 3D). Never caches mutating requests or
//      authenticated API GETs (cross-user leak risk). Navigation is
//      NetworkFirst w/ 3s timeout; _next/static and images are CacheFirst.

const FALLBACK_TITLE = 'RepLab';
const FALLBACK_BODY = 'You have a new update.';

const CACHE_VERSION = 'v1';
const NAV_CACHE = `mf-nav-${CACHE_VERSION}`;
const STATIC_CACHE = `mf-static-${CACHE_VERSION}`;
const IMAGE_CACHE = `mf-img-${CACHE_VERSION}`;
const KEEP_CACHES = new Set([NAV_CACHE, STATIC_CACHE, IMAGE_CACHE]);

self.addEventListener('install', () => {
  // Activate the new SW immediately on install — avoids stuck-at-old-SW after
  // a deploy. Combined with `clients.claim()` below this means push payloads
  // take effect on the next push, not the next tab refresh.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches that don't match the current CACHE_VERSION so stale
      // chunks from a previous deploy don't linger forever.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('mf-') && !KEEP_CACHES.has(n))
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname === '/sw.js';
}

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  return /\.(?:png|jpg|jpeg|gif|webp|svg|avif|ico)$/i.test(url.pathname);
}

function isNavigation(request) {
  if (request.mode === 'navigate') return true;
  return request.destination === 'document';
}

async function networkFirstWithTimeout(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  const fromNetwork = (async () => {
    const res = await fetch(request);
    if (res && res.ok && res.type === 'basic') {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  })();
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const raced = await Promise.race([fromNetwork, timeout]);
  if (raced) return raced;
  const cached = await cache.match(request);
  if (cached) return cached;
  // Hold for the real network result as last resort.
  return fromNetwork;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok && res.type === 'basic') {
    cache.put(request, res.clone()).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only handle same-origin GETs. Third-party (YouTube, Stripe, CDN images)
  // has its own caching and we don't want to impersonate their CORS policy.
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated API responses — one user's cached /api/
  // clients answer would otherwise leak to another user on a shared device.
  if (url.pathname.startsWith('/api/')) return;

  // Skip the SSE stream — can't cache an event stream.
  if (url.pathname.startsWith('/api/notifications/stream')) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (isImageRequest(request, url)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  if (isNavigation(request)) {
    event.respondWith(networkFirstWithTimeout(request, NAV_CACHE, 3000));
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: FALLBACK_TITLE, body: event.data.text?.() ?? FALLBACK_BODY };
  }

  const title = payload.title || FALLBACK_TITLE;
  const options = {
    body: payload.body || FALLBACK_BODY,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    // `tag` + renotify: true collapses bursts into a single OS notification
    // that still re-announces when updated. Per-type tag means a new PR
    // doesn't hide a separate new-message alert.
    tag: payload.tag || 'mf-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If we already have a tab open on any URL, focus it and navigate —
      // don't spawn a second tab for the same app. Falls back to opening a
      // new window if nothing's open.
      for (const client of allClients) {
        if ('focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client && typeof client.navigate === 'function') {
              await client.navigate(targetUrl);
            }
            return;
          } catch {
            // Fall through to openWindow on navigate failure
          }
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
