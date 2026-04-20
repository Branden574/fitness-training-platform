'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function TakedownPage() {
  return (
    <Suspense fallback={null}>
      <TakedownInner />
    </Suspense>
  );
}

function TakedownInner() {
  const sp = useSearchParams();
  const [contentType, setContentType] = useState<'transformation' | 'testimonial' | 'profile'>(
    'transformation',
  );
  const [contentId, setContentId] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = sp.get('type');
    if (t === 'transformation' || t === 'testimonial' || t === 'profile') {
      setContentType(t);
    }
    const cid = sp.get('contentId');
    if (cid) setContentId(cid);
  }, [sp]);

  const submit = async () => {
    setError(null);
    if (reason.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }
    if (!reporterEmail.trim() || !contentId.trim()) {
      setError('Email and content reference are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/legal/takedown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType,
          contentId: contentId.trim(),
          reporterEmail: reporterEmail.trim(),
          reporterName: reporterName.trim() || undefined,
          reason: reason.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Submission failed. Please try again.');
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main
        data-mf
        className="mf-bg mf-fg"
        style={{ minHeight: '100vh', padding: '48px 20px 80px' }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
            LEGAL · TAKEDOWN REQUEST
          </div>
          <h1
            className="mf-font-display"
            style={{ fontSize: 36, margin: 0, lineHeight: 1.1 }}
          >
            Report content for removal
          </h1>
          <p
            className="mf-fg-dim"
            style={{ fontSize: 14, lineHeight: 1.5, marginTop: 12, marginBottom: 32 }}
          >
            Submit a request if you believe content on this platform infringes
            your rights (privacy, image, copyright, etc). We review every
            request and will respond to the email you provide.
          </p>

          {submitted ? (
            <div
              className="mf-card"
              style={{
                padding: 20,
                borderColor: 'var(--mf-accent)',
                color: 'var(--mf-fg)',
              }}
            >
              Request received. We&apos;ll respond to {reporterEmail}.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="CONTENT TYPE">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['transformation', 'testimonial', 'profile'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContentType(t)}
                      className="mf-btn"
                      style={{
                        height: 36,
                        padding: '0 12px',
                        background:
                          contentType === t ? 'var(--mf-accent)' : 'transparent',
                        color: contentType === t ? '#0A0A0B' : 'var(--mf-fg)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="CONTENT REFERENCE (URL OR ID)">
                <input
                  className="mf-input"
                  value={contentId}
                  onChange={(e) => setContentId(e.target.value)}
                  placeholder="e.g. cky... or a profile URL"
                />
              </Field>
              <Field label="YOUR NAME (optional)">
                <input
                  className="mf-input"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  maxLength={120}
                />
              </Field>
              <Field label="YOUR EMAIL">
                <input
                  type="email"
                  className="mf-input"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="WHAT'S THE ISSUE?">
                <textarea
                  className="mf-input"
                  rows={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={2000}
                />
              </Field>
              {error && (
                <div role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>
                  {error}
                </div>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mf-btn mf-btn-primary"
                style={{ height: 44 }}
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div
        className="mf-font-mono mf-fg-dim"
        style={{ fontSize: 10, letterSpacing: '.15em', marginBottom: 6 }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}
