/* global self, clients */

// Martinez Fitness service worker.
// Registered at /sw.js with scope '/' so it controls the whole app.
// Handles two browser events only:
//   - `push`: receive a VAPID web-push payload and show an OS-level notification.
//   - `notificationclick`: open or focus the app at the notification's actionUrl.
// Kept intentionally minimal — no runtime caching, no offline shell, no
// background sync. Offline caching is 3D's responsibility, not 3A's.

const FALLBACK_TITLE = 'Martinez Fitness';
const FALLBACK_BODY = 'You have a new update.';

self.addEventListener('install', () => {
  // Activate the new SW immediately on install — avoids stuck-at-old-SW after
  // a deploy. Combined with `clients.claim()` below this means push payloads
  // take effect on the next push, not the next tab refresh.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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
