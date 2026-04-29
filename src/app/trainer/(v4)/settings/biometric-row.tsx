'use client';

import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import {
  authenticateBiometric,
  checkBiometrySupport,
  clearUnlocked,
  isBiometricEnabled,
  isNativeApp,
  markUnlocked,
  setBiometricEnabled,
} from '@/lib/nativeBiometric';

// Inline variant of BiometricToggle that renders a single row WITHOUT its own
// mf-card shell, so it can sit as the 5th row inside the Account card. The
// stand-alone BiometricToggle component is still used elsewhere (client
// settings page) — this is a settings-page-specific shape, not a replacement.
//
// Returns null on plain browsers or devices without enrolled biometrics so
// the row simply doesn't render rather than showing a useless toggle.

export default function BiometricRow() {
  const [support, setSupport] = useState<{ available: boolean; label?: string } | null>(null);
  const [enabled, setEnabledState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!isNativeApp()) {
        setSupport({ available: false });
        return;
      }
      const s = await checkBiometrySupport();
      setSupport({ available: s.available, label: s.label });
      setEnabledState(isBiometricEnabled());
    })();
  }, []);

  async function toggle() {
    setError(null);
    setBusy(true);
    try {
      if (!enabled) {
        const ok = await authenticateBiometric(
          `Enable ${support?.label ?? 'biometric'} unlock`,
        );
        if (!ok) {
          setError('Could not verify. Nothing changed.');
          return;
        }
        setBiometricEnabled(true);
        markUnlocked();
        setEnabledState(true);
      } else {
        setBiometricEnabled(false);
        clearUnlocked();
        setEnabledState(false);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!support) return null;
  if (!support.available) return null;

  const label = support.label ?? 'Biometrics';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderTop: '1px solid var(--mf-hairline, #1F1F22)',
      }}
    >
      <Shield size={14} className="mf-fg-mute" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.2 }}>Biometric sign-in</div>
        <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 2 }}>
          {enabled
            ? `${label} unlock is on for this device.`
            : `Use ${label} to unlock the app on this device.`}
        </div>
        {error && (
          <div
            className="mf-font-mono"
            style={{ fontSize: 10, color: 'var(--mf-red)', marginTop: 4 }}
          >
            {error}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? `Disable ${label} unlock` : `Enable ${label} unlock`}
        style={{
          width: 30,
          height: 17,
          borderRadius: 10,
          background: enabled ? 'var(--mf-accent, #FF4D1C)' : 'var(--mf-hairline-strong, #2E2E33)',
          position: 'relative',
          transition: 'background 0.2s ease',
          flexShrink: 0,
          border: 'none',
          padding: 0,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: enabled ? 15 : 2,
            width: 13,
            height: 13,
            borderRadius: 10,
            background: '#fff',
            transition: 'left 0.2s ease',
          }}
        />
      </button>
    </div>
  );
}
