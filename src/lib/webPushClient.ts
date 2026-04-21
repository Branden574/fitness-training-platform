// Browser-side helpers for registering the service worker and subscribing to
// web-push. Keep this in its own file so the NotificationBell + prompt
// components don't drift from the canonical flow.
//
// IMPORTANT: every call below MUST originate from a user gesture (click).
// Notification.requestPermission() outside a gesture is silently denied
// on Chrome and gets the origin blocked on Safari.

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  // Allocate against a concrete ArrayBuffer so the type narrows for
  // PushManager.subscribe's applicationServerKey (rejects SharedArrayBuffer-
  // backed views under TS strict DOM lib).
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (!existing) {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    // `register()` resolves as soon as registration is accepted, NOT when the
    // SW is active. Calling pushManager.subscribe() before the SW activates
    // throws AbortError: "no active Service Worker". `navigator.serviceWorker.ready`
    // resolves when there's an activated SW controlling this scope, so we
    // await that explicitly — works on both fresh install and re-opens.
    const ready = await navigator.serviceWorker.ready;
    return ready;
  } catch (err) {
    console.warn('[push] SW register failed:', err);
    return null;
  }
}

export async function subscribeForPush(
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  if (!vapidPublicKey) {
    console.warn('[push] VAPID public key missing — cannot subscribe');
    return null;
  }

  let permission: NotificationPermission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return null;

  const reg = await registerServiceWorker();
  if (!reg) return null;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  } catch (err) {
    console.warn('[push] pushManager.subscribe failed:', err);
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch (err) {
    console.warn('[push] unsubscribe failed:', err);
  }
  return endpoint;
}

export async function postSubscriptionToServer(
  sub: PushSubscription,
): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok;
  } catch (err) {
    console.warn('[push] server subscribe POST failed:', err);
    return false;
  }
}

export async function deleteSubscriptionFromServer(
  endpoint: string | null,
): Promise<boolean> {
  try {
    const url = endpoint
      ? `/api/notifications/subscribe?endpoint=${encodeURIComponent(endpoint)}`
      : '/api/notifications/subscribe';
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('[push] server unsubscribe DELETE failed:', err);
    return false;
  }
}
