'use client';

import { useMemo, useState } from 'react';
import { Mail, Phone, BellOff, Inbox, UserPlus, Check, Loader2 } from 'lucide-react';

type Kind = 'APPLICATION' | 'NOTIFY_WHEN_OPEN';
type Status = 'NEW' | 'IN_PROGRESS' | 'CONTACTED' | 'INVITED' | 'COMPLETED';

export interface SerializedSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: Status;
  kind: Kind;
  waitlist: boolean;
  notifiedAt: string | null;
  createdAt: string;
}

const STATUSES: Status[] = ['NEW', 'IN_PROGRESS', 'CONTACTED', 'INVITED', 'COMPLETED'];
const STATUS_LABEL: Record<Status, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  CONTACTED: 'Contacted',
  INVITED: 'Invited',
  COMPLETED: 'Completed',
};

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const min = Math.floor((now - t) / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ApplicationsClient({
  initial,
}: {
  initial: SerializedSubmission[];
}) {
  const [items, setItems] = useState(initial);
  const [kindFilter, setKindFilter] = useState<'ALL' | Kind>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Status>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);

  // Per-submission invite state. Keyed by submission id so a navigation
  // between submissions doesn't lose the just-issued code.
  const [invites, setInvites] = useState<
    Record<string, { code: string | null; emailSent: boolean }>
  >({});
  const [inviteBusy, setInviteBusy] = useState<'idle' | 'creating' | 'sending'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items.filter((s) => {
        if (kindFilter !== 'ALL' && s.kind !== kindFilter) return false;
        if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
        return true;
      }),
    [items, kindFilter, statusFilter],
  );

  const selected = filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  const updateStatus = async (id: string, next: Status) => {
    // optimistic
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));
    const res = await fetch(`/api/trainers/me/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      // revert on failure
      setItems((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: initial.find((i) => i.id === id)?.status ?? 'NEW' } : s,
        ),
      );
    }
  };

  // Accept an applicant: create an Invitation row (which auto-sets the
  // submission's status to INVITED) and email the applicant their invite
  // code in one click. Two endpoints in sequence — if the second fails the
  // invitation still exists and the trainer can resend.
  const acceptAndInvite = async (s: SerializedSubmission) => {
    if (s.kind !== 'APPLICATION') return;
    setInviteError(null);
    setInviteBusy('creating');
    try {
      const create = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: s.email, submissionId: s.id }),
      });
      const data = await create.json().catch(() => ({}));
      if (!create.ok) {
        throw new Error(data?.message ?? 'Could not create invitation');
      }
      const code: string | null = data?.code ?? null;
      if (!code) {
        throw new Error('Invitation created but no code was returned');
      }
      // Mark INVITED locally and store the code for this submission.
      setItems((prev) =>
        prev.map((it) => (it.id === s.id ? { ...it, status: 'INVITED' } : it)),
      );
      setInvites((prev) => ({ ...prev, [s.id]: { code, emailSent: false } }));

      // Now send the invite email.
      setInviteBusy('sending');
      const send = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: s.name, inviteCode: code }),
      });
      if (send.ok) {
        setInvites((prev) => ({ ...prev, [s.id]: { code, emailSent: true } }));
      } else {
        // Invitation exists but email send failed; let the trainer retry.
        setInviteError('Invite created. Email failed to send — try Resend.');
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviteBusy('idle');
    }
  };

  const resendInviteEmail = async (s: SerializedSubmission) => {
    const code = invites[s.id]?.code;
    if (!code) return;
    setInviteError(null);
    setInviteBusy('sending');
    try {
      const send = await fetch('/api/send-invite-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: s.name, inviteCode: code }),
      });
      if (!send.ok) throw new Error('Email send failed');
      setInvites((prev) => ({ ...prev, [s.id]: { code, emailSent: true } }));
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Resend failed');
    } finally {
      setInviteBusy('idle');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
      {/* Filter strip */}
      <div
        className="mf-card"
        style={{
          padding: 12,
          marginBottom: 20,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <FilterGroup
          label="KIND"
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'APPLICATION', label: 'Applications' },
            { value: 'NOTIFY_WHEN_OPEN', label: 'Notify-me' },
          ]}
          value={kindFilter}
          onChange={(v) => setKindFilter(v as 'ALL' | Kind)}
        />
        <FilterGroup
          label="STATUS"
          options={[
            { value: 'ALL', label: 'All' },
            ...STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as 'ALL' | Status)}
        />
        <div className="mf-fg-mute" style={{ fontSize: 11, marginLeft: 'auto' }}>
          {filtered.length} of {items.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="mf-card"
          style={{
            padding: 48,
            textAlign: 'center',
            display: 'grid',
            placeItems: 'center',
            gap: 12,
          }}
        >
          <Inbox size={40} className="mf-fg-mute" aria-hidden />
          <div className="mf-eyebrow">No matches</div>
          <div className="mf-fg-dim" style={{ fontSize: 13, maxWidth: 360 }}>
            {items.length === 0
              ? 'No applications yet. Share your apply link to start.'
              : 'No applications match the current filters.'}
          </div>
        </div>
      ) : (
        <div className="mf-applications-grid">
          {/* List */}
          <div
            className="mf-card"
            style={{ padding: 0, overflow: 'hidden', maxHeight: '70vh', overflowY: 'auto' }}
          >
            {filtered.map((s, i) => {
              const isActive = selected?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '14px 16px',
                    textAlign: 'left',
                    background: isActive ? 'var(--mf-surface-2, #0E0E10)' : 'transparent',
                    borderBottom:
                      i < filtered.length - 1
                        ? '1px solid var(--mf-hairline, #1F1F22)'
                        : 'none',
                    borderLeft: isActive
                      ? '2px solid var(--mf-accent, #FF4D1C)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    color: 'inherit',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </div>
                    <KindBadge kind={s.kind} />
                  </div>
                  <div
                    className="mf-fg-mute"
                    style={{
                      fontSize: 11,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {s.kind === 'NOTIFY_WHEN_OPEN'
                      ? 'Wants to be notified when you reopen.'
                      : s.message || '(no message)'}
                  </div>
                  <div
                    className="mf-fg-mute"
                    style={{
                      fontFamily: 'var(--font-mf-mono), monospace',
                      fontSize: 10,
                      marginTop: 6,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {STATUS_LABEL[s.status].toUpperCase()} · {relativeTime(s.createdAt)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <div className="mf-card" style={{ padding: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 6,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mf-display), sans-serif',
                    fontSize: 22,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.1,
                  }}
                >
                  {selected.name}
                </div>
                <KindBadge kind={selected.kind} />
              </div>
              <div
                className="mf-fg-mute"
                style={{
                  fontFamily: 'var(--font-mf-mono), monospace',
                  fontSize: 11,
                  marginBottom: 16,
                }}
              >
                Submitted {new Date(selected.createdAt).toLocaleString()}
              </div>

              <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
                <a
                  href={`mailto:${selected.email}`}
                  className="mf-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 36,
                    width: 'fit-content',
                  }}
                >
                  <Mail size={14} aria-hidden />
                  {selected.email}
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="mf-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      height: 36,
                      width: 'fit-content',
                    }}
                  >
                    <Phone size={14} aria-hidden />
                    {selected.phone}
                  </a>
                )}
              </div>

              {selected.kind === 'APPLICATION' ? (
                <>
                  <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                    Message
                  </div>
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--mf-surface-2, #0E0E10)',
                      border: '1px solid var(--mf-hairline, #1F1F22)',
                      borderRadius: 4,
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      marginBottom: 20,
                    }}
                  >
                    {selected.message || '(no message)'}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    padding: 14,
                    background: 'var(--mf-surface-2, #0E0E10)',
                    border: '1px solid var(--mf-hairline, #1F1F22)',
                    borderRadius: 4,
                    fontSize: 13,
                    lineHeight: 1.5,
                    marginBottom: 20,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <BellOff size={16} className="mf-fg-mute" aria-hidden style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Notify-me capture.</strong> This person dropped their email
                    while you were set to NOT_ACCEPTING. They&apos;ll be auto-emailed
                    the moment you flip back to ACCEPTING or WAITLIST.
                    {selected.notifiedAt && (
                      <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 6 }}>
                        Notified {new Date(selected.notifiedAt).toLocaleString()}.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Accept & invite — APPLICATION kind only. Once invited (either
                  in this session via the button below or before page load),
                  show the success card with code + Resend. */}
              {selected.kind === 'APPLICATION' && (() => {
                const inviteState = invites[selected.id];
                const alreadyInvited = selected.status === 'INVITED' || !!inviteState;
                if (!alreadyInvited) {
                  return (
                    <div style={{ marginBottom: 20 }}>
                      <button
                        type="button"
                        onClick={() => acceptAndInvite(selected)}
                        disabled={inviteBusy !== 'idle'}
                        className="mf-btn"
                        style={{
                          height: 40,
                          padding: '0 16px',
                          background: 'var(--mf-accent, #FF4D1C)',
                          color: 'var(--mf-accent-ink, #0A0A0B)',
                          borderColor: 'var(--mf-accent, #FF4D1C)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        {inviteBusy === 'creating' ? (
                          <>
                            <Loader2 size={14} aria-hidden style={{ animation: 'spin 1s linear infinite' }} />
                            Creating invitation…
                          </>
                        ) : inviteBusy === 'sending' ? (
                          <>
                            <Loader2 size={14} aria-hidden style={{ animation: 'spin 1s linear infinite' }} />
                            Sending email…
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} aria-hidden />
                            Accept &amp; send invite
                          </>
                        )}
                      </button>
                      <div className="mf-fg-mute" style={{ fontSize: 11, marginTop: 6 }}>
                        Creates a 6-character code, marks this submission as INVITED, and
                        emails {selected.email} the invite link.
                      </div>
                      {inviteError && (
                        <div role="alert" style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>
                          {inviteError}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    className="mf-card"
                    style={{
                      padding: 14,
                      marginBottom: 20,
                      background: 'rgba(43,217,133,0.06)',
                      borderColor: 'rgba(43,217,133,0.32)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: 'var(--mf-green, #2BD985)',
                        marginBottom: 6,
                      }}
                    >
                      <Check size={14} aria-hidden />
                      <span
                        style={{
                          fontFamily: 'var(--font-mf-mono), monospace',
                          fontSize: 10,
                          letterSpacing: '0.1em',
                        }}
                      >
                        INVITED
                      </span>
                    </div>
                    {inviteState?.code ? (
                      <div
                        style={{
                          fontFamily: 'var(--font-mf-mono), monospace',
                          fontSize: 22,
                          letterSpacing: '0.1em',
                          fontVariantNumeric: 'tabular-nums',
                          marginBottom: 6,
                        }}
                      >
                        {inviteState.code}
                      </div>
                    ) : (
                      <div className="mf-fg-dim" style={{ fontSize: 12, marginBottom: 6 }}>
                        Invitation already sent before this session.
                      </div>
                    )}
                    <div className="mf-fg-mute" style={{ fontSize: 11, marginBottom: 10 }}>
                      {inviteState?.emailSent
                        ? `Sent to ${selected.email}.`
                        : inviteState?.code
                        ? 'Code created. Email send pending — use Resend if needed.'
                        : 'See the original invite email or /admin/invitations for the code.'}
                    </div>
                    {inviteState?.code && (
                      <button
                        type="button"
                        onClick={() => resendInviteEmail(selected)}
                        disabled={inviteBusy !== 'idle'}
                        className="mf-btn"
                        style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                      >
                        {inviteBusy === 'sending' ? 'Sending…' : 'Resend invite email'}
                      </button>
                    )}
                    {inviteError && (
                      <div role="alert" style={{ fontSize: 12, color: '#fca5a5', marginTop: 6 }}>
                        {inviteError}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <label
                  className="mf-eyebrow"
                  style={{ marginRight: 4 }}
                  htmlFor={`status-${selected.id}`}
                >
                  Status
                </label>
                <select
                  id={`status-${selected.id}`}
                  value={selected.status}
                  onChange={(e) => updateStatus(selected.id, e.target.value as Status)}
                  className="mf-input"
                  style={{ height: 36, padding: '0 10px', fontSize: 13 }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                {selected.waitlist && (
                  <span
                    className="mf-fg-mute"
                    style={{
                      fontFamily: 'var(--font-mf-mono), monospace',
                      fontSize: 10,
                      letterSpacing: '0.06em',
                    }}
                  >
                    · WAITLIST FLAG
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .mf-applications-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 1024px) {
          .mf-applications-grid {
            grid-template-columns: 360px 1fr;
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        className="mf-fg-mute"
        style={{
          fontFamily: 'var(--font-mf-mono), monospace',
          fontSize: 10,
          letterSpacing: '0.08em',
          marginRight: 4,
        }}
      >
        {label}
      </span>
      <div
        role="radiogroup"
        style={{
          display: 'flex',
          padding: 2,
          background: 'var(--mf-surface-2, #0E0E10)',
          border: '1px solid var(--mf-hairline-strong, #2E2E33)',
          borderRadius: 4,
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
                padding: '4px 10px',
                fontSize: 11,
                fontFamily: 'var(--font-mf-mono), monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
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
    </div>
  );
}

function KindBadge({ kind }: { kind: Kind }) {
  const isApp = kind === 'APPLICATION';
  return (
    <span
      style={{
        fontFamily: 'var(--font-mf-mono), monospace',
        fontSize: 9,
        letterSpacing: '0.08em',
        padding: '2px 6px',
        borderRadius: 3,
        background: isApp
          ? 'rgba(43,217,133,0.10)'
          : 'rgba(110,110,118,0.16)',
        color: isApp ? 'var(--mf-green, #2BD985)' : 'var(--mf-fg-dim, #888)',
        flexShrink: 0,
      }}
    >
      {isApp ? 'APPLY' : 'NOTIFY-ME'}
    </span>
  );
}
