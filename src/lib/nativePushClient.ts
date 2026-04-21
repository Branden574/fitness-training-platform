// Capacitor-side push registration. No-op outside a Capacitor WebView so the
// same Next.js build serves plain browsers (which use web-push) and the
// native iOS/Android wrappers (which use this flow) without branching at the
// page level. Call `registerNativePush()` once from a mount-time effect in
// the app shell; idempotent after the first successful registration.

function getCapacitor(): { isNativePlatform?: () => boolean; getPlatform?: () => string } | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { Capacitor?: unknown };
  const cap = w.Capacitor;
  if (!cap || typeof cap !== 'object') return null;
  return cap as { isNativePlatform?: () => boolean; getPlatform?: () => string };
}

export function isNativeApp(): boolean {
  const cap = getCapacitor();
  return Boolean(cap?.isNativePlatform?.());
}

function nativePlatform(): 'IOS' | 'ANDROID' | null {
  const cap = getCapacitor();
  const p = cap?.getPlatform?.();
  if (p === 'ios') return 'IOS';
  if (p === 'android') return 'ANDROID';
  return null;
}

let started = false;

export async function registerNativePush(): Promise<void> {
  if (started) return;
  if (!isNativeApp()) return;
  started = true;

  const platform = nativePlatform();
  if (!platform) return;

  // Dynamic import so the plugin isn't required in the plain-browser bundle.
  // Capacitor injects the JS bridge at runtime; the package itself is just
  // TypeScript types + a thin proxy.
  let PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications;
  try {
    const mod = await import('@capacitor/push-notifications');
    PushNotifications = mod.PushNotifications;
  } catch (e) {
    console.warn('[nativePush] plugin import failed:', e);
    return;
  }

  try {
    const perm = await PushNotifications.checkPermissions();
    let status = perm.receive;
    if (status === 'prompt' || status === 'prompt-with-rationale') {
      const req = await PushNotifications.requestPermissions();
      status = req.receive;
    }
    if (status !== 'granted') return;

    await PushNotifications.addListener('registration', async (tokenResult) => {
      try {
        await fetch('/api/device-tokens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: tokenResult.value,
            platform,
          }),
        });
      } catch (e) {
        console.warn('[nativePush] token POST failed:', e);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[nativePush] registration error:', err);
    });

    await PushNotifications.register();
  } catch (e) {
    console.warn('[nativePush] register flow failed:', e);
  }
}

export async function unregisterNativePush(token: string): Promise<void> {
  try {
    await fetch(`/api/device-tokens?token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('[nativePush] unregister failed:', e);
  }
}
