// src/app/trainer/(v4)/settings/referral-performance.tsx
import { prisma } from '@/lib/prisma';
import { Sparkline } from '@/components/ui/mf';

async function loadKpis(trainerId: string) {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since12w = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
  const [apps, accepted, weekly] = await Promise.all([
    prisma.contactSubmission.count({
      where: {
        trainerId,
        kind: 'APPLICATION',
        createdAt: { gte: since30 },
      },
    }),
    prisma.contactSubmission.count({
      where: {
        trainerId,
        kind: 'APPLICATION',
        status: 'INVITED',
        createdAt: { gte: since30 },
      },
    }),
    prisma.contactSubmission.findMany({
      where: { trainerId, kind: 'APPLICATION', createdAt: { gte: since12w } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Bucket applications by week — last 12 weeks ending this week.
  const buckets = new Array(12).fill(0);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const row of weekly) {
    const ageWeeks = Math.floor((now - row.createdAt.getTime()) / weekMs);
    if (ageWeeks >= 0 && ageWeeks < 12) buckets[11 - ageWeeks] += 1;
  }
  return { apps, accepted, weekly: buckets };
}

export async function ReferralPerformance({ trainerId }: { trainerId: string }) {
  const { apps, accepted, weekly } = await loadKpis(trainerId);
  const acceptedPct = apps > 0 ? Math.round((accepted / apps) * 100) : 0;

  return (
    <section>
      <div className="mf-eyebrow" style={{ marginBottom: 8 }}>REFERRAL PERFORMANCE</div>
      <div className="mf-card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
          <div>
            <div
              className="mf-fg-mute"
              style={{
                fontFamily: 'var(--font-mf-mono), monospace',
                fontSize: 9,
                marginBottom: 2,
                letterSpacing: '0.06em',
              }}
            >
              APPLICATIONS · 30D
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mf-display), sans-serif',
                fontSize: 22,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {apps}
            </div>
          </div>
          <div>
            <div
              className="mf-fg-mute"
              style={{
                fontFamily: 'var(--font-mf-mono), monospace',
                fontSize: 9,
                marginBottom: 2,
                letterSpacing: '0.06em',
              }}
            >
              ACCEPTED · 30D
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mf-display), sans-serif',
                fontSize: 22,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {accepted}
            </div>
            <div
              className="mf-fg-mute"
              style={{
                fontFamily: 'var(--font-mf-mono), monospace',
                fontSize: 10,
                marginTop: 4,
              }}
            >
              {acceptedPct}% of apps
            </div>
          </div>
        </div>
        {weekly.some((n) => n > 0) && (
          <div
            style={{
              paddingTop: 12,
              marginTop: 12,
              borderTop: '1px solid var(--mf-hairline, #1F1F22)',
            }}
          >
            <Sparkline data={weekly} />
          </div>
        )}
      </div>
    </section>
  );
}
