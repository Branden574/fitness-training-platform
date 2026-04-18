import { ArrowDown } from 'lucide-react';
import { requireAdminSession, relativeShort } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';
import { getAllFlags } from '@/lib/feature-flags';
import { Btn, Chip, DesktopShell, StatusDot } from '@/components/ui/mf';
import FlagTogglesClient from './flag-toggles-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  range?: '24h' | '7d' | '30d';
}

const RANGE_LABEL: Record<string, string> = {
  '24h': 'TODAY',
  '7d': '7 DAYS',
  '30d': '30 DAYS',
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const range = sp.range ?? '24h';

  const since = new Date();
  if (range === '24h') since.setDate(since.getDate() - 1);
  else if (range === '7d') since.setDate(since.getDate() - 7);
  else since.setDate(since.getDate() - 30);

  const [events, adminLogs, loginEvents, failedLogins, apiLogs, flags] = await Promise.all([
    prisma.adminLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.adminLog.count({ where: { createdAt: { gte: since } } }),
    prisma.loginEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.loginEvent.count({ where: { createdAt: { gte: since }, success: false } }),
    prisma.apiRequestLog.count({ where: { createdAt: { gte: since } } }),
    getAllFlags(),
  ]);

  const recentLogins = await prisma.loginEvent.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });


  return (
    <DesktopShell
      role="admin"
      active="audit"
      title="Audit Log"
      breadcrumbs="ADMIN / AUDIT"
      headerRight={<Btn variant="ghost" icon={ArrowDown}>Export CSV</Btn>}
    >
      <div style={{ padding: 24, maxWidth: 1200 }}>
        {/* Range + summary */}
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="mf-card flex gap-1" style={{ padding: 4 }}>
            {(['24h', '7d', '30d'] as const).map((r) => {
              const active = range === r;
              return (
                <a
                  key={r}
                  href={`/admin/audit?range=${r}`}
                  className="mf-font-mono"
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    borderRadius: 4,
                    background: active ? 'var(--mf-accent)' : 'transparent',
                    color: active ? 'var(--mf-accent-ink)' : 'var(--mf-fg-dim)',
                  }}
                >
                  {RANGE_LABEL[r]}
                </a>
              );
            })}
          </div>
          <div
            className="mf-font-mono mf-fg-mute flex gap-6"
            style={{ fontSize: 10, letterSpacing: '0.1em' }}
          >
            <span>
              {adminLogs} ADMIN ACTIONS · {loginEvents} LOGINS
              {failedLogins > 0 ? ` · ${failedLogins} FAILED` : ''} · {apiLogs.toLocaleString()} API CALLS
            </span>
          </div>
        </div>

        {/* Admin events */}
        <div className="mf-card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="mf-eyebrow">ADMIN ACTIONS</div>
            <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              {events.length} IN RANGE
            </span>
          </div>
          {events.length === 0 ? (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
            >
              NO ADMIN ACTIONS IN THIS RANGE
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {events.map((e, i) => (
                <div
                  key={e.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 2fr 2fr',
                    gap: 12,
                    padding: '10px 0',
                    alignItems: 'center',
                    borderBottom: i < events.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  }}
                >
                  <div
                    className="mf-font-mono mf-fg-mute mf-tnum"
                    style={{ fontSize: 11 }}
                  >
                    {e.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{e.adminEmail}</div>
                  <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                    {e.action}
                  </div>
                  <div
                    className="mf-fg-dim"
                    style={{
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {e.targetEmail ?? e.targetUserId ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Login events */}
        <div className="mf-card" style={{ padding: 20, marginBottom: 16 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="mf-eyebrow">
              LOGIN EVENTS {failedLogins > 0 && <span style={{ color: 'var(--mf-red)' }}>· {failedLogins} FAILED</span>}
            </div>
            <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              {recentLogins.length} SHOWN
            </span>
          </div>
          {recentLogins.length === 0 ? (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
            >
              NO LOGIN EVENTS IN RANGE
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentLogins.map((l, i) => (
                <div
                  key={l.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 1fr 1fr',
                    gap: 12,
                    padding: '10px 0',
                    alignItems: 'center',
                    borderBottom: i < recentLogins.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  }}
                >
                  <div className="mf-font-mono mf-fg-mute mf-tnum" style={{ fontSize: 11 }}>
                    {l.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {l.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusDot kind={l.success ? 'active' : 'behind'} />
                    <span
                      className="mf-font-mono mf-fg-dim"
                      style={{ fontSize: 10, letterSpacing: '0.1em' }}
                    >
                      {l.success ? 'SUCCESS' : (l.reason ?? 'FAILED').toUpperCase()}
                    </span>
                  </div>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 11 }}>
                    {relativeShort(l.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature flags */}
        <div className="mf-card" style={{ padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="mf-eyebrow">FEATURE FLAGS</div>
            <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              {flags.filter((f) => f.enabled).length} / {flags.length} ACTIVE
            </span>
          </div>
          <FlagTogglesClient
            initial={flags.map((f) => ({
              key: f.key,
              enabled: f.enabled,
              description: f.description,
              updatedBy: f.updatedBy,
            }))}
          />
        </div>
      </div>
    </DesktopShell>
  );
}
