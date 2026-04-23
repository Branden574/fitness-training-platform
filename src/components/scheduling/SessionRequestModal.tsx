'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type SessionRequestMode = 'trainer' | 'client';

export interface SessionRequestModalClient {
  id: string;
  name: string | null;
  email: string;
}

export interface SessionRequestModalProps {
  /** 'trainer' lets the caller pick which client the session is for.
   *  'client' hides the client picker and books against their coach. */
  mode: SessionRequestMode;
  open: boolean;
  onClose: () => void;
  /** Fires after a successful create. Pass the new appointment through so
   *  callers can refresh lists locally without a full reload. */
  onCreated?: (appointment: unknown) => void;
  /** Required when mode === 'trainer' — the trainer's roster. */
  clients?: SessionRequestModalClient[];
  /** Required when mode === 'client' — the assigned trainer. */
  coachId?: string;
  coachName?: string | null;
}

const DURATIONS = [30, 45, 60, 90];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function SessionRequestModal({
  mode,
  open,
  onClose,
  onCreated,
  clients,
  coachId,
  coachName,
}: SessionRequestModalProps) {
  const [clientId, setClientId] = useState<string>('');
  const [title, setTitle] = useState<string>(
    mode === 'client' ? 'Training session' : '',
  );
  const [date, setDate] = useState<string>(todayIsoDate());
  const [time, setTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Reset form every time the modal opens so stale fields don't linger.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setError(null);
    setSubmitting(false);
    if (mode === 'trainer') {
      setTitle('');
    } else {
      setTitle('Training session');
    }
    setDate(todayIsoDate());
    setTime('09:00');
    setDuration(60);
    setLocation('');
    setNotes('');
    setClientId(mode === 'trainer' && clients && clients.length === 1 ? clients[0]!.id : '');
    // Focus the first interactive input. Defer a tick so the portal mounts.
    const t = setTimeout(() => firstInputRef.current?.focus(), 20);
    return () => {
      clearTimeout(t);
      previouslyFocused.current?.focus?.();
    };
  }, [open, mode, clients]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const targetTrainerId = mode === 'client' ? coachId : undefined;
    const targetClientId = mode === 'trainer' ? clientId : undefined;

    if (mode === 'trainer' && !targetClientId) {
      setError('Pick a client for this session.');
      return;
    }
    if (mode === 'client' && !targetTrainerId) {
      setError('No coach assigned to your account yet.');
      return;
    }
    if (!title.trim()) {
      setError('Add a short title so your client knows what the session is for.');
      return;
    }

    // Build ISO timestamps from the local date+time inputs.
    const startTime = new Date(`${date}T${time}:00`);
    if (Number.isNaN(startTime.getTime())) {
      setError('Invalid date or time.');
      return;
    }
    const endTime = new Date(startTime.getTime() + duration * 60_000);

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: targetTrainerId,
          clientId: targetClientId,
          title: title.trim(),
          type: 'TRAINING_SESSION',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          location: location.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create session.');
        setSubmitting(false);
        return;
      }
      const appointment = await res.json();
      onCreated?.(appointment);
      onClose();
    } catch {
      setError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  const heading =
    mode === 'trainer' ? 'New session' : `Request session with ${coachName ?? 'your coach'}`;
  const submitLabel = submitting
    ? 'Sending…'
    : mode === 'trainer'
      ? 'Create session'
      : 'Request session';

  const node = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(0,0,0,0.72)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="mf-card"
        style={{
          width: '100%',
          maxWidth: 520,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--mf-hairline)',
            flexShrink: 0,
          }}
        >
          <div
            className="mf-font-display"
            style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: '-0.005em' }}
          >
            {heading}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mf-btn mf-btn-ghost"
            style={{ width: 32, height: 32, padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: 20,
            display: 'grid',
            gap: 14,
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {error ? (
            <div
              className="mf-chip mf-chip-bad"
              role="alert"
              style={{
                height: 'auto',
                padding: '10px 12px',
                display: 'block',
                width: '100%',
                fontSize: 12,
              }}
            >
              {error}
            </div>
          ) : null}

          {mode === 'trainer' ? (
            <label className="block">
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>CLIENT</div>
              <select
                className="mf-input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Pick a client…</option>
                {(clients ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.email}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>TITLE</div>
            <input
              ref={firstInputRef}
              type="text"
              className="mf-input"
              placeholder={mode === 'trainer' ? 'e.g. Upper body · Week 3' : 'e.g. Check-in'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label className="block">
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>DATE</div>
              <input
                type="date"
                className="mf-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <div className="mf-eyebrow" style={{ marginBottom: 6 }}>TIME</div>
              <input
                type="time"
                className="mf-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </label>
          </div>

          <label className="block">
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>DURATION</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className="mf-btn"
                  style={{
                    height: 36,
                    padding: '0 14px',
                    fontSize: 13,
                    background: duration === d ? 'var(--mf-accent)' : 'var(--mf-surface-2)',
                    color: duration === d ? 'var(--mf-accent-ink)' : 'var(--mf-fg)',
                    borderColor: duration === d ? 'var(--mf-accent)' : 'var(--mf-hairline-strong)',
                  }}
                >
                  {d} min
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>LOCATION (optional)</div>
            <input
              type="text"
              className="mf-input"
              placeholder={mode === 'trainer' ? 'The Iron Office · Fresno' : 'Where would you like to meet?'}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={120}
            />
          </label>

          <label className="block">
            <div className="mf-eyebrow" style={{ marginBottom: 6 }}>NOTES (optional)</div>
            <textarea
              className="mf-input"
              rows={3}
              placeholder={
                mode === 'trainer'
                  ? "What's the plan? (visible to the client)"
                  : 'Anything your coach should know?'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>

          {mode === 'client' ? (
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              Requests stay pending until your coach approves them.
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '14px 20px',
            borderTop: '1px solid var(--mf-hairline)',
            flexShrink: 0,
          }}
        >
          <button type="button" onClick={onClose} className="mf-btn" disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="mf-btn mf-btn-primary"
            disabled={submitting}
            style={{ minWidth: 140 }}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(node, document.body);
}
