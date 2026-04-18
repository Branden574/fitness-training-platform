import Link from 'next/link';
import { MessageSquare, Edit } from 'lucide-react';
import {
  Avatar,
  Btn,
  DesktopShell,
  Heatmap,
  LineChart,
} from '@/components/ui/mf';
import CoachNotesClient from './coach-notes-client';

export interface ClientDetailDesktopProps {
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  createdAt: Date;
  fitnessLevel: string | null;
  age: number | null;
  weight: number | null;
  fullInitials: string;
  adherencePct: number;
  streakDays: number;
  prCount: number;
  uniqueDays: number;
  totalWorkoutDays: number;
  totalCompletedSessions: number;
  primarySeries: number[];
  primaryLabel: string;
  labels: string[];
  compliance: number[][];
  recentSessions: Array<{
    id: string;
    startTime: Date;
    endTime: Date | null;
    workout: { title: string; type: string | null };
    workoutProgress: Array<{ weight: number | null; reps: number | null; sets: number | null }>;
  }>;
  initialNotes: Array<{
    id: string;
    body: string;
    context: 'GENERAL' | 'TRAINING' | 'NUTRITION' | 'PROGRESS';
    createdAt: string;
  }>;
}

export default function ClientDetailDesktop({
  clientId,
  clientName,
  clientEmail,
  createdAt,
  fitnessLevel,
  age,
  weight,
  fullInitials,
  adherencePct,
  streakDays,
  prCount,
  uniqueDays,
  totalWorkoutDays,
  totalCompletedSessions,
  primarySeries,
  primaryLabel,
  labels,
  compliance,
  recentSessions,
  initialNotes,
}: ClientDetailDesktopProps) {
  const displayName = (clientName ?? clientEmail).toUpperCase();

  return (
    <div className="hidden md:block">
      <DesktopShell
        role="trainer"
        active="clientdetail"
        title={clientName ?? clientEmail}
        breadcrumbs={`ROSTER / ${(clientName ?? clientEmail).toUpperCase()}`}
        headerRight={
          <>
            <Link href="/trainer/messages">
              <Btn icon={MessageSquare}>Message</Btn>
            </Link>
            <Link href="/trainer/builder">
              <Btn variant="primary" icon={Edit}>Edit program</Btn>
            </Link>
          </>
        }
      >
        <div style={{ padding: 24, maxWidth: 1400 }}>
          {/* Hero */}
          <div
            className="mf-card-elev"
            style={{
              padding: 20,
              marginBottom: 24,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              gap: 24,
              alignItems: 'center',
            }}
          >
            <Avatar initials={fullInitials} size={72} active />
            <div>
              <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
                COACHED · SINCE {createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '.')}
              </div>
              <div
                className="mf-font-display"
                style={{ fontSize: 36, lineHeight: 1, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
              >
                {displayName}
              </div>
              <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 11, marginTop: 4 }}>
                {fitnessLevel ?? '—'} ·{' '}
                {age ? `${age}Y` : '—'} ·{' '}
                {weight ? `${weight} LB` : '—'}
              </div>
            </div>
            <div className="flex gap-4">
              <HeroStat label="ADHERENCE" value={`${adherencePct}`} unit="%" />
              <div className="mf-vr" />
              <HeroStat label="STREAK" value={`${streakDays}`} accent />
              <div className="mf-vr" />
              <HeroStat label="PRS / 90D" value={`${prCount}`} />
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {/* Strength chart */}
            <div className="mf-card" style={{ padding: 16, gridColumn: 'span 2' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div>
                  <div className="mf-eyebrow">BIG THREE · PEAK WEIGHT BY WEEK</div>
                  <div className="mf-fg-dim" style={{ fontSize: 12, marginTop: 2 }}>
                    12 WEEKS · FROM LOGGED SETS
                  </div>
                </div>
                <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                  SHOWING {primaryLabel}
                </div>
              </div>
              {primarySeries.some((v) => v > 0) ? (
                <LineChart data={primarySeries.map((v) => (v > 0 ? v : 0))} labels={labels} h={220} />
              ) : (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{ padding: 48, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
                >
                  NO LIFT DATA YET
                </div>
              )}
            </div>

            {/* Adherence */}
            <div className="mf-card" style={{ padding: 16 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 8 }}>ADHERENCE · 12 WK</div>
              <div className="mf-font-display mf-tnum" style={{ fontSize: 32, lineHeight: 1, marginBottom: 12 }}>
                {adherencePct}
                <span className="mf-fg-mute" style={{ fontSize: 14 }}>%</span>
              </div>
              <Heatmap cells={compliance} cell={14} />
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--mf-hairline)' }}>
                <Row label="Logged" value={`${totalCompletedSessions}`} />
                <Row label="Unique days" value={`${uniqueDays} / ${totalWorkoutDays}`} />
                <Row label="PRs tracked" value={`${prCount}`} />
              </div>
            </div>

            {/* Recent sessions */}
            <div className="mf-card" style={{ padding: 16, gridColumn: 'span 2' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div className="mf-eyebrow">RECENT SESSIONS</div>
                <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>
                  {recentSessions.length} SHOWN
                </span>
              </div>
              {recentSessions.length === 0 && (
                <div
                  className="mf-fg-mute mf-font-mono"
                  style={{ padding: 32, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
                >
                  NO COMPLETED SESSIONS YET
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentSessions.map((s) => {
                  const d = s.startTime;
                  const mo = String(d.getMonth() + 1).padStart(2, '0');
                  const dy = String(d.getDate()).padStart(2, '0');
                  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                  const durationMin = s.endTime
                    ? Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000)
                    : null;
                  const totalVol = s.workoutProgress.reduce(
                    (acc, wp) => acc + (wp.weight ?? 0) * (wp.reps ?? 0) * (wp.sets ?? 1),
                    0,
                  );
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3"
                      style={{ padding: '8px 8px', borderRadius: 4 }}
                    >
                      <div className="mf-font-mono mf-fg-mute mf-tnum" style={{ fontSize: 11, width: 48 }}>
                        {mo}.{dy}
                      </div>
                      <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 10, width: 32 }}>
                        {weekday}
                      </div>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{s.workout.title}</div>
                      <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 11 }}>
                        {durationMin ? `${durationMin} MIN` : '—'}
                      </div>
                      <div
                        className="mf-font-display mf-tnum"
                        style={{ fontSize: 14, width: 96, textAlign: 'right' }}
                      >
                        {totalVol > 0 ? `${totalVol.toLocaleString()} LB` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coach notes */}
            <CoachNotesClient
              clientId={clientId}
              initial={initialNotes}
            />
          </div>
        </div>
      </DesktopShell>
    </div>
  );
}

function HeroStat({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        className="mf-font-display mf-tnum"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color: accent ? 'var(--mf-accent)' : undefined,
        }}
      >
        {value}
        {unit ? <span className="mf-fg-mute" style={{ fontSize: 14 }}>{unit}</span> : null}
      </div>
      <div className="mf-eyebrow" style={{ marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
      <span className="mf-fg-dim">{label}</span>
      <span className="mf-font-mono mf-tnum">{value}</span>
    </div>
  );
}
