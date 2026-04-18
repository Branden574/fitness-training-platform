import Link from 'next/link';
import { Calendar as CalendarIcon, Plus, Check, Video } from 'lucide-react';
import { Avatar, Chip, TrainerMobileTabs } from '@/components/ui/mf';
import type { ScheduleAppointment, ScheduleClient } from './schedule-desktop';
import type { AppointmentType, AppointmentStatus } from '@prisma/client';

export interface ScheduleMobileProps {
  appointments: ScheduleAppointment[];
  clients: ScheduleClient[];
  weekStart: Date;
  weekEnd: Date;
}

function typeLabel(t: AppointmentType): string {
  switch (t) {
    case 'TRAINING_SESSION':
      return '1:1';
    case 'CHECK_IN':
      return 'CHECK-IN';
    case 'NUTRITION_CONSULTATION':
      return 'NUT';
    case 'ASSESSMENT':
      return 'ASSESS';
    case 'FOLLOW_UP':
      return 'FOLLOW';
    default:
      return 'SESSION';
  }
}

function typeColor(t: AppointmentType, status: AppointmentStatus): string {
  if (status === 'CANCELLED') return 'var(--mf-fg-mute)';
  switch (t) {
    case 'TRAINING_SESSION':
      return 'var(--mf-accent)';
    case 'NUTRITION_CONSULTATION':
      return 'var(--mf-green)';
    case 'CHECK_IN':
      return 'var(--mf-amber)';
    case 'ASSESSMENT':
    case 'FOLLOW_UP':
    default:
      return 'var(--mf-blue)';
  }
}

function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initialsFor(name: string | null, email: string): string {
  const src = (name && name.trim().length > 0 ? name : email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ScheduleMobile({
  appointments,
  weekStart,
  weekEnd,
}: ScheduleMobileProps) {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todays = appointments
    .filter((a) => a.startTime.toDateString() === now.toDateString())
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const current = todays.find((a) => a.startTime <= now && a.endTime >= now) ?? null;
  const upcoming = todays.filter(
    (a) => a.startTime > now && (!current || a.id !== current.id),
  );

  // Day scroller: show 7 days of the current week
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const sessionsCount = todays.filter((a) => a.type === 'TRAINING_SESSION').length;
  const checkInsCount = todays.filter((a) => a.type === 'CHECK_IN').length;
  const otherCount = todays.length - sessionsCount - checkInsCount;

  const eyebrow = now
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();

  return (
    <div
      data-mf
      className="md:hidden mf-bg mf-fg"
      style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center' }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 430,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderInline: '1px solid var(--mf-hairline)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--mf-hairline)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{
                  fontSize: 9,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                }}
              >
                {eyebrow}
              </div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 22,
                  letterSpacing: '-0.01em',
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                TODAY
              </div>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="grid place-items-center rounded"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--mf-surface-2)',
                }}
                aria-label="Open calendar"
              >
                <CalendarIcon size={14} />
              </button>
              <button
                type="button"
                className="grid place-items-center rounded"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--mf-accent)',
                  color: 'var(--mf-accent-ink)',
                }}
                aria-label="New session"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginTop: 12,
            }}
          >
            <div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                SESSIONS
              </div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 20, lineHeight: 1 }}
              >
                {sessionsCount}
              </div>
            </div>
            <div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                CHECK-INS
              </div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 20, lineHeight: 1 }}
              >
                {checkInsCount}
              </div>
            </div>
            <div>
              <div
                className="mf-font-mono mf-fg-mute"
                style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                OTHER
              </div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 20, lineHeight: 1 }}
              >
                {otherCount}
              </div>
            </div>
          </div>

          {/* Day scroller */}
          <div className="flex gap-1" style={{ marginTop: 12 }}>
            {days.map((d) => {
              const isToday = d.toDateString() === now.toDateString();
              const label = d
                .toLocaleDateString('en-US', { weekday: 'short' })
                .toUpperCase()
                .slice(0, 3);
              return (
                <div
                  key={d.toISOString()}
                  className="mf-font-mono"
                  style={{
                    flex: 1,
                    padding: '6px 0',
                    borderRadius: 4,
                    textAlign: 'center',
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: isToday ? 'var(--mf-accent)' : 'var(--mf-surface-3)',
                    color: isToday ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  }}
                >
                  {label} {d.getDate()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 80px' }}>
          {/* Current session hero */}
          {current && (
            <div
              className="mf-card"
              style={{
                padding: 12,
                marginBottom: 12,
                background:
                  'linear-gradient(135deg, rgba(255,77,28,0.15), var(--mf-surface-2))',
                border: '1px solid var(--mf-hairline-strong)',
                borderRadius: 6,
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <Chip kind="live">HAPPENING NOW</Chip>
                <span className="mf-font-mono" style={{ fontSize: 10 }}>
                  {formatHM(current.startTime)} — {formatHM(current.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Avatar
                  initials={initialsFor(current.client.name, current.client.email)}
                  size={42}
                  active
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="mf-font-display"
                    style={{
                      fontSize: 16,
                      lineHeight: 1.1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {current.client.name ?? current.client.email}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {typeLabel(current.type)} · {current.title}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <Link
                  href={`/trainer/clients/${current.client.id}`}
                  className="mf-btn flex items-center justify-center gap-1"
                  style={{ height: 36, fontSize: 11 }}
                >
                  <Video size={11} /> DETAILS
                </Link>
                <Link
                  href={`/trainer/clients/${current.client.id}`}
                  className="mf-btn mf-btn-primary flex items-center justify-center gap-1"
                  style={{ height: 36, fontSize: 11 }}
                >
                  <Check size={11} /> START SESSION
                </Link>
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div
            className="mf-font-mono mf-fg-mute"
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              padding: '0 4px',
              marginBottom: 8,
            }}
          >
            UPCOMING · {upcoming.length}
          </div>

          {upcoming.length === 0 && !current && (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              NOTHING BOOKED TODAY
            </div>
          )}

          {upcoming.map((a) => {
            const col = typeColor(a.type, a.status);
            const kind = typeLabel(a.type);
            return (
              <Link
                key={a.id}
                href={`/trainer/clients/${a.client.id}`}
                className="mf-card flex items-center gap-3"
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 40,
                    borderRadius: 2,
                    background: col,
                    flexShrink: 0,
                  }}
                />
                <div style={{ width: 48, flexShrink: 0, textAlign: 'center' }}>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{ fontSize: 16, lineHeight: 1 }}
                  >
                    {formatHM(a.startTime)}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 8, marginTop: 2 }}
                  >
                    {a.duration}m
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a.client.name ?? a.client.email}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 9,
                      marginTop: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {a.title}
                  </div>
                </div>
                <span
                  className="mf-font-mono"
                  style={{
                    fontSize: 8,
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: `${col}20`,
                    color: col,
                    flexShrink: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {kind}
                </span>
              </Link>
            );
          })}
        </div>

        <TrainerMobileTabs active="schedule" />
      </div>
    </div>
  );
}
