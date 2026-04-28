'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { Lock, Fingerprint } from 'lucide-react';
import {
  authenticateBiometric,
  isBiometricEnabled,
  isNativeApp,
  isUnlockedForSession,
  markUnlocked,
} from '@/lib/nativeBiometric';

// Wraps the authenticated shell. If the user opted into biometric on this
// device and the session hasn't been unlocked recently, renders a blocking
// overlay that prompts Face ID / Touch ID / fingerprint before revealing
// children. On web (or when biometric isn't opted in), children pass
// through immediately — this is purely a mobile convenience gate.

type Status = 'idle' | 'locked' | 'prompting' | 'unlocked';

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (!isNativeApp() || !isBiometricEnabled()) {
      setStatus('unlocked');
      return;
    }
    if (isUnlockedForSession()) {
      setStatus('unlocked');
      return;
    }
    setStatus('locked');
    // Small delay so the native prompt doesn't race the page paint.
    const t = setTimeout(() => void promptNow(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function promptNow() {
    if (status === 'prompting') return;
    setStatus('prompting');
    const ok = await authenticateBiometric('Unlock RepLab');
    if (ok) {
      markUnlocked();
      setStatus('unlocked');
    } else {
      setStatus('locked');
    }
  }

  if (status === 'unlocked' || status === 'idle') {
    return <>{children}</>;
  }

  return (
    <>
      <div aria-hidden style={{ display: 'none' }}>{children}</div>
      <div
        data-mf
        className="mf-bg mf-fg"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          className="mf-card-elev"
          style={{
            width: '100%',
            maxWidth: 340,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: 'var(--mf-surface)',
              border: '1px solid var(--mf-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {status === 'prompting' ? (
              <Fingerprint size={24} />
            ) : (
              <Lock size={22} />
            )}
          </div>
          <div className="mf-eyebrow">LOCKED</div>
          <div
            className="mf-font-display"
            style={{ fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.1 }}
          >
            Verify to continue
          </div>
          <div className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5 }}>
            RepLab is locked on this device. Use your biometrics or
            device passcode to unlock.
          </div>
          <button
            type="button"
            onClick={promptNow}
            disabled={status === 'prompting'}
            className="mf-btn mf-btn-primary"
            style={{ width: '100%', height: 44 }}
          >
            {status === 'prompting' ? 'Waiting…' : 'Unlock'}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className="mf-btn mf-btn-ghost"
            style={{ width: '100%', height: 40 }}
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
