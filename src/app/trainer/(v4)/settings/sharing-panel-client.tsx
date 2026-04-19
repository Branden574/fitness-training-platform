'use client';

import { useEffect, useState } from 'react';

export default function SharingPanelClient() {
  const [slug, setSlug] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/trainers/me/ensure-identity', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSlug(data.slug);
        setCode(data.referralCode);
      }
      setBootstrapped(true);
    })();
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = slug ? `${origin}/apply/${slug}` : '';

  const copy = async (text: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // no-op
    }
  };

  const patch = async (body: Record<string, boolean>) => {
    await fetch('/api/trainers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const toggleAccepting = async () => {
    const next = !accepting;
    setAccepting(next);
    await patch({ acceptingClients: next });
  };

  const togglePublic = async () => {
    const next = !isPublic;
    setIsPublic(next);
    await patch({ isPublic: next });
  };

  return (
    <section style={{ marginTop: 32 }}>
      <div className="mf-eyebrow" style={{ marginBottom: 12 }}>
        SHARING · YOUR REFERRAL CHANNELS
      </div>
      <div
        className="mf-card"
        style={{ padding: 20, display: 'grid', gap: 20 }}
      >
        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            PERSONAL LINK
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="mf-input"
              readOnly
              value={bootstrapped ? link : 'Generating…'}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mf-mono), monospace',
                fontSize: 12,
              }}
            />
            <button
              type="button"
              onClick={() => copy(link, 'link')}
              disabled={!link}
              className="mf-btn"
              style={{ height: 40 }}
            >
              {copied === 'link' ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 6 }}
          >
            Add to Instagram bio, TikTok, business cards.
          </div>
        </div>

        {slug && (
          <div>
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
              QR CODE
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Using <img> so we can hit the auth-gated /api/trainers/qr endpoint
                  with browser cookies; next/image is less flexible for dynamic API routes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/trainers/qr?format=png"
                alt="QR code for your apply link"
                width={120}
                height={120}
                style={{ borderRadius: 4, background: '#0A0A0B' }}
              />
              <div style={{ display: 'grid', gap: 6 }}>
                <a
                  href="/api/trainers/qr?format=png"
                  download
                  className="mf-btn"
                  style={{ textAlign: 'center' }}
                >
                  Download PNG
                </a>
                <a
                  href="/api/trainers/qr?format=svg"
                  download
                  className="mf-btn"
                  style={{ textAlign: 'center' }}
                >
                  Download SVG
                </a>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            TRAINER CODE
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div
              style={{
                padding: '10px 16px',
                background: 'var(--mf-surface-2, #0E0E10)',
                border: '1px solid var(--mf-hairline, #1F1F22)',
                borderRadius: 4,
                fontFamily: 'var(--font-mf-mono), monospace',
                fontSize: 18,
                letterSpacing: '0.15em',
              }}
            >
              MF-{code ?? '—'}
            </div>
            <button
              type="button"
              onClick={() => copy(code ?? '', 'code')}
              disabled={!code}
              className="mf-btn"
              style={{ height: 40 }}
            >
              {copied === 'code' ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 6 }}
          >
            Share over the phone or in conversation. Clients enter it at /apply.
          </div>
        </div>

        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            VISIBILITY
          </div>
          <button
            type="button"
            onClick={togglePublic}
            className="mf-btn"
            style={{ height: 40, marginRight: 8 }}
          >
            {isPublic ? '● Public — show in directory' : '○ Private — direct link only'}
          </button>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 6 }}
          >
            Your personal link works either way. Public listings will land in
            Phase 2 of the platform.
          </div>
        </div>

        <div>
          <div className="mf-eyebrow" style={{ marginBottom: 6 }}>
            STATUS
          </div>
          <button
            type="button"
            onClick={toggleAccepting}
            className="mf-btn"
            style={{ height: 40 }}
          >
            {accepting
              ? '● Accepting new clients · Pause'
              : '○ Paused — click to resume'}
          </button>
          <div
            className="mf-fg-dim"
            style={{ fontSize: 11, marginTop: 6 }}
          >
            When paused your link still works but shows a waitlist card instead
            of the form.
          </div>
        </div>
      </div>
    </section>
  );
}
