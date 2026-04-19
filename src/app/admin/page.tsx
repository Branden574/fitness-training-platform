import Link from 'next/link';
import { Filter } from 'lucide-react';
import { requireAdminSession, initialsFor, relativeShort } from '@/lib/admin-data';
import RefreshButton from '@/components/admin/RefreshButton';
import { prisma } from '@/lib/prisma';
import {
  Avatar,
  Btn,
  Chip,
  DesktopShell,
  StatCard,
  StatusDot,
  LineChart,
} from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export default async function AdminOverviewPage() {
  await requireAdminSession();

  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twelveWks = new Date();
  twelveWks.setDate(twelveWks.getDate() - 12 * 7);

  const [
    totalUsers,
    activeClients,
    totalTrainers,
    newThisMonth,
    logged30d,
    sessionsHistorical,
    pendingInvitations,
    newContactSubmissions,
    topTrainers,
    atRiskClients,
    planMixCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'CLIENT', isActive: true } }),
    prisma.user.count({ where: { role: 'TRAINER' } }),
    prisma.user.count({ where: { createdAt: { gte: thirty } } }),
    prisma.workoutSession.count({ where: { startTime: { gte: thirty } } }),
    prisma.workoutSession.findMany({
      where: { startTime: { gte: twelveWks } },
      select: { startTime: true },
    }),
    prisma.invitation.count({ where: { status: 'PENDING' } }),
    prisma.contactSubmission.count({ where: { status: 'NEW' } }),
    // Trainers ranked by assigned client count
    prisma.user.findMany({
      where: { role: 'TRAINER' },
      select: {
        id: true,
        name: true,
        email: true,
        clients: { where: { isActive: true }, select: { id: true } },
        createdAt: true,
      },
      take: 8,
    }),
    // Clients with no activity in 3+ days
    prisma.user.findMany({
      where: {
        role: 'CLIENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        trainerId: true,
        workoutSessions: {
          orderBy: { startTime: 'desc' },
          take: 1,
          select: { startTime: true },
        },
      },
      take: 50,
    }),
    prisma.user.groupBy({
      by: ['role', 'isActive'],
      _count: { _all: true },
    }),
  ]);

  // Weekly session bucket (12 weeks → count per week)
  const weekStart = startOfWeek();
  const bucketed: number[] = Array(12).fill(0);
  for (const s of sessionsHistorical) {
    const diff = Math.floor((weekStart.getTime() - s.startTime.getTime()) / 86400000);
    const weeksAgo = Math.floor(diff / 7);
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    bucketed[11 - weeksAgo]! += 1;
  }
  const sessionLabels = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

  // Top trainers → sort by client count desc
  const rankedTrainers = topTrainers
    .map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      count: t.clients.length,
      initials: initialsFor(t.name, t.email),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // At-risk: last session > 3 days OR no session ever (and active)
  const risk = atRiskClients
    .map((c) => {
      const last = c.workoutSessions[0]?.startTime ?? null;
      const diffDays = last ? (Date.now() - last.getTime()) / 86400000 : Infinity;
      return { c, last, diffDays };
    })
    .filter((x) => x.diffDays > 3)
    .slice(0, 6);

  // Plan mix: use role as a stand-in for plan mix since we have no Plan model
  const planCoached = activeClients;
  const planTrainers = totalTrainers;
  const planInactive = planMixCounts
    .filter((r) => r.role === 'CLIENT' && !r.isActive)
    .reduce((s, r) => s + r._count._all, 0);
  const planTotal = totalUsers || 1;

  const prevThirty = new Date();
  prevThirty.setDate(prevThirty.getDate() - 60);

  const prev30Sessions = await prisma.workoutSession.count({
    where: { startTime: { gte: prevThirty, lt: thirty } },
  });
  const sessionsDelta = logged30d - prev30Sessions;
  const sessionsDeltaStr =
    prev30Sessions > 0
      ? `${sessionsDelta >= 0 ? '+' : ''}${Math.round((sessionsDelta / prev30Sessions) * 100)}%`
      : sessionsDelta > 0
        ? `+${sessionsDelta}`
        : undefined;

  return (
    <DesktopShell
      role="admin"
      active="stats"
      title="Platform Overview"
      breadcrumbs="ADMIN / OVERVIEW"
      headerRight={
        <>
          <Btn variant="ghost" icon={Filter}>30 DAYS</Btn>
          <RefreshButton />
        </>
      }
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Stat strip */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}
        >
          <StatCard
            label="TOTAL USERS"
            value={totalUsers.toLocaleString()}
            accent
            delta={newThisMonth > 0 ? `+${newThisMonth} / 30D` : undefined}
          />
          <StatCard
            label="ACTIVE CLIENTS"
            value={activeClients.toLocaleString()}
          />
          <StatCard
            label="TRAINERS"
            value={totalTrainers.toLocaleString()}
          />
          <StatCard
            label="SESSIONS · 30D"
            value={logged30d.toLocaleString()}
            delta={sessionsDeltaStr}
          />
        </div>

        {/* Main grid */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}
        >
          {/* Sessions chart */}
          <div className="mf-card" style={{ padding: 20, gridColumn: 'span 2' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div>
                <div className="mf-eyebrow">SESSIONS LOGGED · 12 WK</div>
                <div
                  className="mf-font-display mf-tnum"
                  style={{ fontSize: 32, lineHeight: 1, marginTop: 4 }}
                >
                  {bucketed.reduce((a, b) => a + b, 0).toLocaleString()}
                </div>
              </div>
              <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, letterSpacing: '0.1em' }}>
                ALL USERS
              </div>
            </div>
            {bucketed.some((v) => v > 0) ? (
              <LineChart data={bucketed} labels={sessionLabels} h={220} />
            ) : (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 48, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                NO SESSION DATA YET
              </div>
            )}
          </div>

          {/* User mix */}
          <div className="mf-card" style={{ padding: 20 }}>
            <div className="mf-eyebrow" style={{ marginBottom: 16 }}>USER MIX</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <MixBar
                label="Clients · active"
                value={planCoached}
                total={planTotal}
                color="var(--mf-accent)"
              />
              <MixBar
                label="Trainers"
                value={planTrainers}
                total={planTotal}
                color="var(--mf-fg)"
              />
              <MixBar
                label="Clients · inactive"
                value={planInactive}
                total={planTotal}
                color="var(--mf-fg-mute)"
              />
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {/* Top trainers */}
          <div className="mf-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow">TOP TRAINERS · BY CLIENT COUNT</div>
              <Link href="/admin/users?role=TRAINER" className="mf-fg-dim" style={{ fontSize: 11 }}>
                View all →
              </Link>
            </div>
            {rankedTrainers.length === 0 ? (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                NO TRAINERS YET
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {rankedTrainers.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3" style={{ padding: '8px 8px' }}>
                    <div
                      className="mf-font-mono mf-fg-mute mf-tnum"
                      style={{ fontSize: 10, width: 20 }}
                    >
                      0{i + 1}
                    </div>
                    <Avatar initials={t.initials} size={28} />
                    <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{t.name ?? t.email}</div>
                    <div
                      className="mf-font-mono mf-fg-dim mf-tnum"
                      style={{ fontSize: 10 }}
                    >
                      {t.count} ATHL
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* At risk */}
          <div className="mf-card" style={{ padding: 20 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="mf-eyebrow">AT-RISK ACCOUNTS</div>
              <Chip kind={risk.length > 0 ? 'warn' : 'ok'}>
                {risk.length} FLAGGED
              </Chip>
            </div>
            {risk.length === 0 ? (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                EVERYONE'S LOGGING
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {risk.map(({ c, last, diffDays }) => {
                  const reason = last
                    ? `${Math.floor(diffDays)} days no log`
                    : 'No sessions yet';
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3"
                      style={{ padding: '8px 8px' }}
                    >
                      <StatusDot kind="behind" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.name ?? c.email}
                        </div>
                        <div
                          className="mf-font-mono mf-fg-mute"
                          style={{
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}
                        >
                          {reason}
                        </div>
                      </div>
                      <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                        {relativeShort(last)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Admin quick-links */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 24,
          }}
        >
          <QuickLink
            href="/admin/invitations"
            eyebrow="INVITATIONS"
            title={`${pendingInvitations} pending`}
            subtitle="Issue + track invite codes"
          />
          <QuickLink
            href="/admin/contacts"
            eyebrow="CONTACTS"
            title={`${newContactSubmissions} new inbound`}
            subtitle="Review + triage submissions"
          />
          <QuickLink
            href="/admin/audit"
            eyebrow="AUDIT"
            title="Login events + API"
            subtitle="Security + activity feed"
          />
        </div>
      </div>
    </DesktopShell>
  );
}

function MixBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between" style={{ fontSize: 12, marginBottom: 6 }}>
        <span className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, background: color }} /> {label}
        </span>
        <span className="mf-font-mono mf-tnum">{value.toLocaleString()}</span>
      </div>
      <div style={{ height: 4, background: 'var(--mf-hairline)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  eyebrow,
  title,
  subtitle,
}: {
  href: string;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="mf-card"
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div className="mf-eyebrow">{eyebrow}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div className="mf-fg-dim" style={{ fontSize: 12 }}>{subtitle}</div>
    </Link>
  );
}
