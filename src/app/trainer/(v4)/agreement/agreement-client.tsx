'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  markdown: string;
  version: string;
  returnTo: string;
}

export default function AgreementClient({ markdown, version, returnTo }: Props) {
  const router = useRouter();
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAccept = agreed1 && agreed2 && !submitting;

  const accept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/trainers/me/agreement', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not record acceptance. Try again.');
        return;
      }
      router.push(returnTo);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="mf-card"
        style={{
          padding: 24,
          maxHeight: 520,
          overflowY: 'auto',
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {markdown}
      </div>

      <div
        className="mf-font-mono mf-fg-mute"
        style={{ fontSize: 10, letterSpacing: '.1em', marginTop: 12 }}
      >
        VERSION · {version}
      </div>

      <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={agreed1}
            onChange={(e) => setAgreed1(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I have read and agree to the Terms of Service, Liability Waiver,
            and Content Warranty.
          </span>
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={agreed2}
            onChange={(e) => setAgreed2(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>
            I understand I am fully responsible for all content I post,
            including all client consents and releases.
          </span>
        </label>
      </div>

      {error && (
        <div role="alert" style={{ color: '#fca5a5', fontSize: 12, marginTop: 12 }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={!canAccept}
        className="mf-btn mf-btn-primary"
        style={{ height: 44, marginTop: 20, minWidth: 180 }}
      >
        {submitting ? 'Recording…' : 'I Agree →'}
      </button>
    </>
  );
}
