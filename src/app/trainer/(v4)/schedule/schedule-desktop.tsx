import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Btn, DesktopShell } from '@/components/ui/mf';
import type { AppointmentType, AppointmentStatus } from '@prisma/client';

export interface ScheduleAppointment {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  client: { id: string; name: string | null; email: string; image: string | null };
}

export interface ScheduleClient {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface ScheduleDesktopProps {
  appointments: ScheduleAppointment[];
  clients: ScheduleClient[];
  weekStart: Date;
  weekEnd: Date;
}

function decimalHour(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

function colorForType(t: AppointmentType, status: AppointmentStatus): string {
  if (status === 'CANCELLED') return '#6E6E76';
  switch (t) {
    case 'TRAINING_SESSION':
      return '#FF4D1C';
    case 'NUTRITION_CONSULTATION':
      return '#2BD985';
    case 'CHECK_IN':
      return '#F5B544';
    case 'ASSESSMENT':
    case 'FOLLOW_UP':
    default:
      return '#4D9EFF';
  }
}

export default function ScheduleDesktop({
  appointments,
  clients,
  weekStart,
  weekEnd,
}: ScheduleDesktopProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      num: d.getDate(),
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });

  const hours = Array.from({ length: 13 }, (_, i) => i + 6); // 6am – 6pm

  const bookedCount = appointments.filter((a) => a.status !== 'CANCELLED').length;
  const openSlots = Math.max(0, 5 * 7 - bookedCount);

  const nowDec = decimalHour(new Date());

  const plotable = appointments.filter((a) => {
    const start = decimalHour(a.startTime);
    const end = decimalHour(a.endTime);
    return start >= 6 && end <= 19;
  });

  const monthLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${weekStart.getDate()} — ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${weekEnd.getDate() - 1}, ${weekStart.getFullYear()}`;

  const todaysAppointments = appointments.filter(
    (a) => a.startTime.toDateString() === new Date().toDateString(),
  );

  return (
    <div className="hidden md:block">
      <DesktopShell
        role="trainer"
        active="schedule"
        title="Schedule"
        breadcrumbs="COACHING · CALENDAR"
        headerRight={
          <>
            <Btn icon={CalendarIcon}>Sync to Google</Btn>
            <Btn variant="primary" icon={Plus}>New session</Btn>
          </>
        }
      >
        {/* Week strip */}
        <div
          className="mf-s1 flex items-center gap-4"
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--mf-hairline)',
          }}
        >
          <div className="flex items-center gap-1">
            <button
              className="mf-btn"
              style={{ width: 28, height: 28, padding: 0 }}
              aria-label="Previous week"
            >
              <ChevronLeft size={13} />
            </button>
            <button className="mf-btn" style={{ height: 28, fontSize: 11 }}>
              Today
            </button>
            <button
              className="mf-btn"
              style={{ width: 28, height: 28, padding: 0 }}
              aria-label="Next week"
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <div>
            <div
              className="mf-font-display"
              style={{ fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1 }}
            >
              {monthLabel}
            </div>
            <div
              className="mf-font-mono mf-fg-mute"
              style={{
                fontSize: 10,
                marginTop: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {bookedCount} SESSIONS BOOKED · {openSlots} OPEN SLOTS · {clients.length} CLIENTS
            </div>
          </div>
          <div
            className="mf-font-mono mf-fg-mute flex items-center gap-4"
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              textTransform: 'uppercase',
            }}
          >
            {(
              [
                ['#FF4D1C', '1-ON-1'],
                ['#4D9EFF', 'CONSULT'],
                ['#2BD985', 'NUTRITION'],
                ['#F5B544', 'CHECK-IN'],
                ['#6E6E76', 'BLOCK'],
              ] as const
            ).map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>

        <div style={{ overflow: 'auto' }}>
          <div style={{ display: 'flex' }}>
            {/* Hours column */}
            <div
              className="mf-s1 shrink-0"
              style={{ width: 64, borderRight: '1px solid var(--mf-hairline)' }}
            >
              <div style={{ height: 36, borderBottom: '1px solid var(--mf-hairline)' }} />
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    height: 52,
                    borderBottom: '1px solid var(--mf-hairline)',
                    position: 'relative',
                  }}
                >
                  <span
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 8,
                      transform: 'translateY(-50%)',
                      fontSize: 9,
                    }}
                  >
                    {h < 12 ? `${h}:00` : h === 12 ? '12:00' : `${h - 12}:00`}
                    <span className="mf-fg-mute" style={{ marginLeft: 2, fontSize: 8 }}>
                      {h < 12 ? 'AM' : 'PM'}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
              }}
            >
              {days.map((d, di) => (
                <div
                  key={di}
                  style={{
                    borderRight: '1px solid var(--mf-hairline)',
                    position: 'relative',
                    background: d.isToday ? 'rgba(255,77,28,0.02)' : 'transparent',
                  }}
                >
                  {/* Day header */}
                  <div
                    className="mf-s1 flex items-center justify-center gap-2"
                    style={{
                      height: 36,
                      borderBottom: '1px solid var(--mf-hairline)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {d.label}
                    </span>
                    <span
                      className={d.isToday ? 'mf-font-display mf-accent' : 'mf-font-display'}
                      style={{ fontSize: 14 }}
                    >
                      {d.num}
                    </span>
                    {d.isToday && (
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--mf-accent)',
                        }}
                      />
                    )}
                  </div>

                  {/* Hour slots */}
                  <div style={{ position: 'relative', height: hours.length * 52 }}>
                    {hours.map((h, i) => (
                      <div
                        key={h}
                        style={{
                          height: 52,
                          borderBottom: '1px solid var(--mf-hairline)',
                          background: i % 2 ? 'transparent' : 'rgba(255,255,255,0.01)',
                        }}
                      />
                    ))}

                    {/* Now line */}
                    {d.isToday && nowDec >= 6 && nowDec <= 19 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: (nowDec - 6) * 52,
                          zIndex: 3,
                        }}
                      >
                        <div style={{ height: 1, background: 'var(--mf-accent)' }} />
                        <div
                          style={{
                            position: 'absolute',
                            left: -4,
                            top: -4,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--mf-accent)',
                          }}
                        />
                      </div>
                    )}

                    {/* Appointments */}
                    {plotable
                      .filter((a) => a.startTime.toDateString() === d.date.toDateString())
                      .map((a) => {
                        const startH = decimalHour(a.startTime);
                        const endH = decimalHour(a.endTime);
                        const top = (startH - 6) * 52;
                        const height = Math.max(24, (endH - startH) * 52 - 2);
                        const color = colorForType(a.type, a.status);
                        const isBlock = a.status === 'CANCELLED';
                        return (
                          <div
                            key={a.id}
                            style={{
                              position: 'absolute',
                              left: 4,
                              right: 4,
                              top,
                              height,
                              borderRadius: 4,
                              padding: 6,
                              overflow: 'hidden',
                              background: isBlock ? 'var(--mf-surface-3)' : `${color}1A`,
                              border: `1px solid ${isBlock ? 'var(--mf-hairline-strong)' : color + '66'}`,
                              borderLeft: `3px solid ${color}`,
                              zIndex: 2,
                            }}
                          >
                            <div
                              className="mf-font-display"
                              style={{
                                fontSize: 11,
                                lineHeight: 1.1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: isBlock ? 'var(--mf-fg-mute)' : 'var(--mf-fg)',
                              }}
                            >
                              {(a.client.name ?? a.client.email).toUpperCase()}
                            </div>
                            {height > 28 && (
                              <div
                                className="mf-font-mono mf-fg-mute"
                                style={{
                                  fontSize: 8,
                                  marginTop: 2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                }}
                              >
                                {String(Math.floor(startH)).padStart(2, '0')}:
                                {String(Math.round((startH % 1) * 60)).padStart(2, '0')} ·{' '}
                                {a.title}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's agenda */}
          <div
            className="mf-s1"
            style={{
              padding: '20px 24px',
              borderTop: '1px solid var(--mf-hairline)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div>
                <div className="mf-eyebrow">
                  TODAY ·{' '}
                  {new Date()
                    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    .toUpperCase()}
                </div>
                <div
                  className="mf-font-display"
                  style={{ fontSize: 18, letterSpacing: '-0.01em', marginTop: 4 }}
                >
                  {todaysAppointments.length} SESSION{todaysAppointments.length === 1 ? '' : 'S'}
                </div>
              </div>
            </div>
            {todaysAppointments.length === 0 ? (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ fontSize: 11, letterSpacing: '0.1em' }}
              >
                NOTHING BOOKED TODAY
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                {todaysAppointments.map((a) => {
                  const color = colorForType(a.type, a.status);
                  const startH = a.startTime;
                  const h = startH.getHours();
                  const m = startH.getMinutes();
                  const durationMin = a.duration;
                  return (
                    <div key={a.id} className="mf-card" style={{ padding: 12 }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                        <span
                          style={{ width: 4, height: 16, borderRadius: 2, background: color }}
                        />
                        <span className="mf-font-mono mf-tnum" style={{ fontSize: 11 }}>
                          {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
                        </span>
                        <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 9 }}>
                          · {durationMin}min
                        </span>
                      </div>
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
                        }}
                      >
                        {a.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DesktopShell>
    </div>
  );
}
