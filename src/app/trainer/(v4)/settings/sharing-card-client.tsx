'use client';

import { useEffect, useState } from 'react';
import {
  TRAINER_STATUSES,
  TRAINER_STATUS_LABELS,
  type TrainerStatus,
} from '@/lib/trainerStatus';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SharingCardClient({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const [isPublic, setIsPublic] = useState(false);
  const [savedStatus, setSavedStatus] = useState<TrainerStatus>('ACCEPTING');
  const [pendingStatus, setPendingStatus] = useState<TrainerStatus>('ACCEPTING');
  const [statusSave, setStatusSave] = useState<SaveState>('idle');

  useEffect(() => {
    (async () => {
      const [identityRes, meRes] = await Promise.all([
        fetch('/api/trainers/me/ensure-identity', { method: 'POST' }),
        fetch('/api/trainers/me'),
      ]);
      if (identityRes.ok) {
        const data = await identityRes.json();
        setSlug(data.slug);
        setCode(data.referralCode);
      }
      if (meRes.ok) {
        const me = await meRes.json();
        const s: TrainerStatus =
          me.trainerClientStatus ??
          (me.trainerAcceptingClients ? 'ACCEPTING' : 'WAITLIST');
        setSavedStatus(s);
        setPendingStatus(s);
        setIsPublic(Boolean(me.trainerIsPublic));
      }
      setBootstrapped(true);
    })();
    // No deps mutated inside the effect — keep deps empty.
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = slug ? `${origin}/apply/${slug}` : '';

  const copy = async (text: string, kind: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* no-op */
    }
  };

  const togglePublic = async (next: boolean) => {
    setIsPublic(next);
    await fetch('/api/trainers/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: next }),
    });
  };

  const dirty = pendingStatus !== savedStatus;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const saveStatus = async () => {
    if (!dirty) return;
    setStatusSave('saving');
    try {
      const res = await fetch('/api/trainers/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientStatus: pendingStatus }),
      });
      if (!res.ok) throw new Error('save failed');
      setSavedStatus(pendingStatus);
      setStatusSave('saved');
      setTimeout(() => setStatusSave('idle'), 2000);
    } catch {
      setStatusSave('error');
    }
  };

  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span>SHARING</span>
        <span className="mf-fg-mute" style={{ fontFamily: 'var(--font-mf-mono), monospace', fontSize: 10 }}>
          YOUR REFERRAL CHANNELS
        </span>
      </div>

      <div className="mf-card" style={{ padding: 0 }}>
        <div className="mf-sharing-grid">
          {/* LEFT 7/12: link + code + visibility/status row */}
          <div className="mf-sharing-left" style={{ padding: 20, borderRight: '1px solid var(--mf-hairline, #1F1F22)' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>PERSONAL LINK</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input
                className="mf-input"
                readOnly
                value={bootstrapped ? link : 'Generating…'}
                style={{ flex: 1, fontFamily: 'var(--font-mf-mono), monospace', fontSize: 12, height: 36 }}
              />
              <button
                type="button"
                onClick={() => copy(link, 'link')}
                disabled={!link}
                className="mf-btn"
                style={{ height: 36 }}
              >
                {copied === 'link' ? 'COPIED ✓' : 'COPY'}
              </button>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginBottom: 20 }}>
              Add to Instagram bio, TikTok, business cards.
            </div>

            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>TRAINER CODE</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div
                style={{
                  padding: '8px 16px',
                  background: 'var(--mf-surface-2, #0E0E10)',
                  border: '1px solid var(--mf-hairline-strong, #2E2E33)',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 18,
                  letterSpacing: '0.18em',
                }}
              >
                {code ?? 'MF-—'}
              </div>
              <button
                type="button"
                onClick={() => copy(code ?? '', 'code')}
                disabled={!code}
                className="mf-btn"
                style={{ height: 36 }}
              >
                {copied === 'code' ? 'COPIED ✓' : 'COPY'}
              </button>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginBottom: 20 }}>
              Share over the phone or in conversation. Clients enter at /apply.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                paddingTop: 16,
                borderTop: '1px solid var(--mf-hairline, #1F1F22)',
              }}
            >
              {/* Visibility — 2-segment, auto-save */}
              <div>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>VISIBILITY</div>
                <Segmented
                  options={[
                    { value: 'private', label: 'Private' },
                    { value: 'public', label: 'Public' },
                  ]}
                  value={isPublic ? 'public' : 'private'}
                  onChange={(v) => togglePublic(v === 'public')}
                />
              </div>
              {/* Status — 3-segment, dirty-state + Save */}
              <div>
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>STATUS</div>
                <Segmented
                  options={TRAINER_STATUSES.map((s) => ({
                    value: s,
                    label: TRAINER_STATUS_LABELS[s],
                  }))}
                  value={pendingStatus}
                  onChange={(v) => setPendingStatus(v as TrainerStatus)}
                />
              </div>
            </div>

            {(dirty || statusSave === 'saved') && (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  marginTop: 12,
                }}
              >
                {dirty ? (
                  <button
                    type="button"
                    onClick={saveStatus}
                    disabled={statusSave === 'saving'}
                    className="mf-btn"
                    style={{
                      height: 32,
                      background: 'var(--mf-accent, #FF4D1C)',
                      color: 'var(--mf-accent-ink, #0A0A0B)',
                      borderColor: 'var(--mf-accent, #FF4D1C)',
                      fontWeight: 600,
                    }}
                  >
                    {statusSave === 'saving'
                      ? 'SAVING…'
                      : statusSave === 'error'
                      ? 'TRY AGAIN'
                      : 'SAVE STATUS'}
                  </button>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-mf-mono), monospace',
                      fontSize: 11,
                      color: 'var(--mf-green, #2BD985)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    ✓ STATUS SAVED
                  </span>
                )}
                {dirty && (
                  <span className="mf-fg-mute" style={{ fontSize: 11 }}>
                    Unsaved change to status.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 5/12: QR */}
          <div className="mf-sharing-right" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>QR CODE</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/trainers/qr?format=png"
                alt="QR code for your apply link"
                width={128}
                height={128}
                style={{ borderRadius: 4, background: '#0A0A0B', flexShrink: 0 }}
              />
              <div style={{ display: 'grid', gap: 8, flex: 1 }}>
                <a href="/api/trainers/qr?format=png" download className="mf-btn" style={{ height: 36, justifyContent: 'flex-start' }}>
                  Download PNG
                </a>
                <a href="/api/trainers/qr?format=svg" download className="mf-btn" style={{ height: 36, justifyContent: 'flex-start' }}>
                  Download SVG
                </a>
              </div>
            </div>
            <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
              Scans deep-link to your apply page — works in Instagram Stories, gym posters, business cards.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mf-sharing-grid {
          display: grid;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .mf-sharing-grid {
            grid-template-columns: 7fr 5fr;
          }
        }
        @media (max-width: 1023px) {
          .mf-sharing-left {
            border-right: none !important;
            border-bottom: 1px solid var(--mf-hairline, #1F1F22);
          }
        }
      `}</style>
    </section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex',
        padding: 2,
        background: 'var(--mf-surface-2, #0E0E10)',
        border: '1px solid var(--mf-hairline-strong, #2E2E33)',
        borderRadius: 4,
        gap: 0,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: 11,
              fontFamily: 'var(--font-mf-mono), monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: active ? 'var(--mf-accent, #FF4D1C)' : 'transparent',
              color: active ? 'var(--mf-accent-ink, #0A0A0B)' : 'var(--mf-fg-dim, #888)',
              fontWeight: active ? 600 : 500,
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
