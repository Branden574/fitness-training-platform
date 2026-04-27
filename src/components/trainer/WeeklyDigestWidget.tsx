// src/components/trainer/WeeklyDigestWidget.tsx
//
// Server component that reads the latest WeeklyDigest for the current
// trainer and renders per-client sections. The same payload that the
// digest email uses — one source of truth, two surfaces.

import { prisma } from '@/lib/prisma';
import type { WeeklyDigestPayload } from '@/lib/digest/buildDigestPayload';

export interface WeeklyDigestWidgetProps {
  trainerId: string;
}

export default async function WeeklyDigestWidget({ trainerId }: WeeklyDigestWidgetProps) {
  const latest = await prisma.weeklyDigest.findFirst({
    where: { trainerId },
    orderBy: { generatedAt: 'desc' },
    select: { payload: true, weekStartIso: true, generatedAt: true },
  });

  if (!latest) {
    return (
      <div
        className="mf-card"
        style={{ padding: 16, marginBottom: 16, color: 'var(--mf-fg-mute)' }}
      >
        <div className="mf-eyebrow">WEEKLY DIGEST</div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          No digest yet — first one ships next Sunday.
        </div>
      </div>
    );
  }

  const payload = latest.payload as unknown as WeeklyDigestPayload;

  return (
    <div className="mf-card" style={{ padding: 16, marginBottom: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div>
          <div className="mf-eyebrow">WEEKLY DIGEST</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
            Week of {payload.weekStartIso} · {payload.clients.length} clients
          </div>
        </div>
        <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
          GENERATED {new Date(payload.generatedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {payload.clients.map((c) => (
          <div
            key={c.clientId}
            style={{
              padding: 12,
              borderRadius: 8,
              background: 'var(--mf-surface-2)',
              border: '1px solid var(--mf-hairline)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.clientName}</div>
              <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                {c.workoutsCompleted}/{c.workoutsAssigned} · {c.adherencePct}%
              </div>
            </div>
            {c.prsThisWeek.length > 0 && (
              <div style={{ color: '#4ade80', fontSize: 12, marginTop: 4 }}>
                PRs: {c.prsThisWeek.map((p) => `${p.exerciseName} ${p.achievement}`).join(', ')}
              </div>
            )}
            {c.regressions.length > 0 && (
              <div style={{ color: '#f87171', fontSize: 12, marginTop: 4 }}>
                Regressions: {c.regressions.map((r) => r.note).join(', ')}
              </div>
            )}
            {c.aiNote && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'var(--mf-fg-dim)',
                }}
              >
                {c.aiNote}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
