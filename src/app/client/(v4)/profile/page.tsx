import Link from 'next/link';
import { ChevronRight, Settings } from 'lucide-react';
import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Avatar } from '@/components/ui/mf';
import ProfileThemeStripClient from './theme-strip-client';

export const dynamic = 'force-dynamic';

async function getProfileStats(userId: string) {
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);

  const [sessionCount, progressCount] = await Promise.all([
    prisma.workoutSession.count({ where: { userId, completed: true } }),
    prisma.progressEntry.count({ where: { userId } }),
  ]);

  // Streak (reuse the same logic: 30d of completed sessions)
  const sessions = await prisma.workoutSession.findMany({
    where: { userId, completed: true, startTime: { gte: thirty } },
    select: { startTime: true },
    orderBy: { startTime: 'desc' },
  });

  const days = new Set(sessions.map((s) => s.startTime.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { sessionCount, progressCount, streak };
}

function formatJoined(d: Date): string {
  return d
    .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    .replace(/\//g, '.');
}

export default async function ClientProfilePage() {
  const session = await requireClientSession();
  const [ctx, stats, user] = await Promise.all([
    getClientContext(session.user.id),
    getProfileStats(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { createdAt: true },
    }),
  ]);

  const sections: Array<{ h: string; items: Array<{ label: string; href?: string }> }> = [
    {
      h: 'ACCOUNT',
      items: [
        { label: 'Email · ' + ctx.email },
        { label: 'Change password', href: '/auth/change-password' },
      ],
    },
    {
      h: 'TRAINING',
      items: [
        { label: `Coach · ${ctx.trainer?.name ?? 'Unassigned'}` },
        { label: 'Current program', href: '/client/program' },
      ],
    },
    {
      h: 'PROGRESS',
      items: [
        { label: 'Scoreboard + charts', href: '/client/progress' },
        { label: 'Food log', href: '/client/food' },
      ],
    },
    {
      h: 'SUPPORT',
      items: [
        { label: 'Contact coach', href: '/client/messages' },
        { label: 'Help + privacy', href: '/contact' },
        { label: 'Sign out', href: '/api/auth/signout' },
      ],
    },
  ];

  return (
    <main style={{ padding: '12px 0' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '12px 20px 16px',
          borderBottom: '1px solid var(--mf-hairline)',
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar initials={ctx.initials} size={48} />
          <div>
            <div
              className="mf-font-display"
              style={{ fontSize: 20, letterSpacing: '-0.01em' }}
            >
              {(ctx.name ?? 'Athlete').toUpperCase()}
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              COACHED · JOINED {user ? formatJoined(user.createdAt) : '—'}
            </div>
          </div>
        </div>
        <button
          className="mf-btn mf-btn-ghost"
          style={{ height: 36, width: 36, padding: 0 }}
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 24 }}>
          <div className="mf-card text-center" style={{ padding: 12 }}>
            <div className="mf-font-display mf-tnum" style={{ fontSize: 28, lineHeight: 1 }}>
              {stats.sessionCount}
            </div>
            <div className="mf-eyebrow" style={{ marginTop: 4 }}>SESSIONS</div>
          </div>
          <div className="mf-card text-center" style={{ padding: 12 }}>
            <div className="mf-font-display mf-tnum" style={{ fontSize: 28, lineHeight: 1 }}>
              {stats.progressCount}
            </div>
            <div className="mf-eyebrow" style={{ marginTop: 4 }}>LOGS</div>
          </div>
          <div className="mf-card text-center" style={{ padding: 12 }}>
            <div className="mf-font-display mf-tnum mf-accent" style={{ fontSize: 28, lineHeight: 1 }}>
              {stats.streak}
            </div>
            <div className="mf-eyebrow" style={{ marginTop: 4 }}>STREAK</div>
          </div>
        </div>

        {/* Preferences (client-side: theme strip) */}
        <div style={{ marginBottom: 20 }}>
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>APPEARANCE</div>
          <div className="mf-card" style={{ padding: 12 }}>
            <ProfileThemeStripClient />
          </div>
        </div>

        {/* Nav sections */}
        {sections.map((s) => (
          <div key={s.h} style={{ marginBottom: 20 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>{s.h}</div>
            <div className="mf-card" style={{ overflow: 'hidden' }}>
              {s.items.map((it, i) => {
                const rowContent = (
                  <>
                    <span style={{ flex: 1, fontSize: 14 }}>{it.label}</span>
                    {it.href ? <ChevronRight size={14} className="mf-fg-mute" /> : null}
                  </>
                );
                const rowStyle = {
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: i < s.items.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                };
                if (it.href) {
                  return (
                    <Link key={it.label} href={it.href} style={rowStyle}>
                      {rowContent}
                    </Link>
                  );
                }
                return (
                  <div key={it.label} style={rowStyle}>
                    {rowContent}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
