'use client';

import { useEffect, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import {
  authenticateBiometric,
  checkBiometrySupport,
  clearUnlocked,
  isBiometricEnabled,
  isNativeApp,
  markUnlocked,
  setBiometricEnabled,
} from '@/lib/nativeBiometric';

// Settings row that lets the user opt into biometric unlock on this device.
// Renders nothing on plain browsers or when the device has no enrolled
// biometric — the toggle would be useless without it. Flipping on runs the
// prompt once so we catch "phone has face ID hardware but user never set it
// up" early and don't silently enable a door we can never open.

export default function BiometricToggle() {
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
      className="mf-card"
      style={{
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 16,
      }}
    >
      <Fingerprint size={18} className="mf-fg-mute" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          {label} unlock
        </div>
        <div className="mf-fg-dim" style={{ fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>
          {enabled
            ? `Uses ${label} (or your passcode) when the app opens after idle.`
            : `Require ${label} to open the app on this device.`}
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
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          padding: 2,
          background: enabled ? 'var(--mf-accent)' : 'var(--mf-surface)',
          cursor: busy ? 'wait' : 'pointer',
          transition: 'background 120ms ease',
          position: 'relative',
        }}
        aria-label={enabled ? `Disable ${label} unlock` : `Enable ${label} unlock`}
      >
        <span
          style={{
            display: 'block',
            width: 20,
            height: 20,
            borderRadius: 10,
            background: '#fff',
            transform: enabled ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 140ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}
