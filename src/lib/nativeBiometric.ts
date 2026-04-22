// Face ID / Touch ID (iOS) + fingerprint/face (Android) via
// @aparajita/capacitor-biometric-auth. Web-side no-ops so the same build
// serves plain browsers. The opt-in flag lives in localStorage so it
// survives reloads but is per-device (which is what we want — enabling
// biometrics on a phone shouldn't also gate access on a laptop).

const ENABLED_KEY = 'mf.biometric.enabled';
const UNLOCKED_SESSION_KEY = 'mf.biometric.unlockedAt';
// Re-prompt if the app resumes after this much idle time. Matches common
// banking-app behavior — a short trip to another app stays unlocked, but a
// full background / foreground cycle after a long idle re-prompts.
const UNLOCK_TTL_MS = 10 * 60 * 1000;

function getCapacitor(): { isNativePlatform?: () => boolean } | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { Capacitor?: unknown };
  const cap = w.Capacitor;
  if (!cap || typeof cap !== 'object') return null;
  return cap as { isNativePlatform?: () => boolean };
}

export function isNativeApp(): boolean {
  return Boolean(getCapacitor()?.isNativePlatform?.());
}

export function isBiometricEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setBiometricEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      window.localStorage.setItem(ENABLED_KEY, '1');
    } else {
      window.localStorage.removeItem(ENABLED_KEY);
      window.sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
    }
  } catch {
    /* localStorage blocked — silently no-op */
  }
}

export function isUnlockedForSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = window.sessionStorage.getItem(UNLOCKED_SESSION_KEY);
    if (!v) return false;
    const t = Number(v);
    if (!Number.isFinite(t)) return false;
    return Date.now() - t < UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(UNLOCKED_SESSION_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

export function clearUnlocked(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
  } catch {
    /* noop */
  }
}

export interface BiometrySupport {
  available: boolean;
  reason?: string;
  /** Human-friendly name for labels: "Face ID", "Touch ID", "Fingerprint". */
  label?: string;
}

export async function checkBiometrySupport(): Promise<BiometrySupport> {
  if (!isNativeApp()) return { available: false, reason: 'not-native' };
  try {
    const mod = await import('@aparajita/capacitor-biometric-auth');
    const result = await mod.BiometricAuth.checkBiometry();
    if (!result.isAvailable) {
      return { available: false, reason: result.reason ?? 'unavailable' };
    }
    const label =
      result.biometryType === mod.BiometryType.faceId
        ? 'Face ID'
        : result.biometryType === mod.BiometryType.touchId
          ? 'Touch ID'
          : result.biometryType === mod.BiometryType.fingerprintAuthentication
            ? 'Fingerprint'
            : result.biometryType === mod.BiometryType.faceAuthentication
              ? 'Face unlock'
              : 'Biometrics';
    return { available: true, label };
  } catch (e) {
    console.warn('[biometric] checkBiometry failed:', e);
    return { available: false, reason: 'error' };
  }
}

/**
 * Prompts biometric auth. Returns true on success, false on cancel /
 * fallback / lockout. Never throws — callers treat it as a pass/fail gate.
 */
export async function authenticateBiometric(reason?: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const mod = await import('@aparajita/capacitor-biometric-auth');
    await mod.BiometricAuth.authenticate({
      reason: reason ?? 'Unlock Martinez Fitness',
      cancelTitle: 'Cancel',
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use device passcode',
      androidTitle: 'Unlock Martinez Fitness',
      androidSubtitle: 'Verify your identity to continue',
    });
    return true;
  } catch (e) {
    const msg = (e as { message?: string })?.message ?? '';
    // Cancelled / user-fallback / lockout all fail closed — caller decides
    // whether to retry, send to sign-in, or do nothing.
    console.info('[biometric] authenticate did not pass:', msg);
    return false;
  }
}
