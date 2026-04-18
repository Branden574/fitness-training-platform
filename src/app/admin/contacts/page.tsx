import { requireAdminSession, initialsFor, relativeShort } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';
import { Avatar, DesktopShell, StatCard } from '@/components/ui/mf';
import ContactsFilterClient from './contacts-filter-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string;
}

const FILTERS = ['ALL', 'NEW', 'IN_PROGRESS', 'CONTACTED', 'INVITED', 'COMPLETED'] as const;

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const status = (sp.status ?? '').toUpperCase();

  const where =
    FILTERS.includes(status as (typeof FILTERS)[number]) && status !== 'ALL'
      ? { status: status as 'NEW' | 'IN_PROGRESS' | 'CONTACTED' | 'INVITED' | 'COMPLETED' }
      : {};

  const [submissions, statusCounts, newCount] = await Promise.all([
    prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.contactSubmission.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.contactSubmission.count({ where: { status: 'NEW' } }),
  ]);

  const counts = Object.fromEntries(
    statusCounts.map((c) => [c.status, c._count._all]),
  ) as Record<string, number>;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <DesktopShell
      role="admin"
      active="contacts"
      title="Contact Submissions"
      breadcrumbs="ADMIN / CONTACTS"
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Stat strip */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}
        >
          <StatCard
            label="NEW · UNTRIAGED"
            value={counts.NEW ?? 0}
            accent
            delta={newCount > 5 ? 'needs attention' : undefined}
          />
          <StatCard label="IN PROGRESS" value={counts.IN_PROGRESS ?? 0} />
          <StatCard label="INVITED" value={counts.INVITED ?? 0} />
          <StatCard label="TOTAL" value={total} />
        </div>

        {/* Filter pills */}
        <ContactsFilterClient
          currentStatus={status}
          counts={{
            ALL: total,
            ...(counts as Record<string, number>),
          }}
        />

        {/* Submissions list */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {submissions.length === 0 && (
            <div
              className="mf-card mf-fg-mute mf-font-mono"
              style={{
                padding: 48,
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              NO SUBMISSIONS IN THIS FILTER
            </div>
          )}

          {submissions.map((s) => (
            <details
              key={s.id}
              className="mf-card"
              style={{ padding: 16 }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  display: 'grid',
                  gridTemplateColumns: 'auto 2fr 1.5fr 1fr 120px',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <Avatar initials={initialsFor(s.name, s.email)} size={36} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.name}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-mute"
                    style={{
                      fontSize: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.email}
                    {s.phone ? ` · ${s.phone}` : ''}
                  </div>
                </div>
                <div
                  className="mf-fg-dim"
                  style={{
                    fontSize: 12,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.fitnessGoals ?? s.message.slice(0, 80) + (s.message.length > 80 ? '…' : '')}
                </div>
                <div>
                  <ContactStatusPill status={s.status} />
                </div>
                <div
                  className="mf-font-mono mf-fg-mute"
                  style={{ fontSize: 11, textAlign: 'right' }}
                >
                  {relativeShort(s.createdAt)}
                </div>
              </summary>

              {/* Expanded detail */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--mf-hairline)' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  {s.age && (
                    <DetailField label="AGE" value={s.age} />
                  )}
                  {s.fitnessLevel && (
                    <DetailField label="LEVEL" value={s.fitnessLevel} />
                  )}
                  {s.availability && (
                    <DetailField label="AVAILABILITY" value={s.availability} />
                  )}
                  {s.currentActivity && (
                    <DetailField label="CURRENT ACTIVITY" value={s.currentActivity} />
                  )}
                  {s.injuries && (
                    <DetailField label="INJURIES" value={s.injuries} />
                  )}
                </div>

                <div className="mf-eyebrow" style={{ marginBottom: 6 }}>MESSAGE</div>
                <div
                  className="mf-card"
                  style={{
                    padding: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    background: 'var(--mf-surface-2)',
                    marginBottom: 16,
                  }}
                >
                  {s.message}
                </div>

                <SubmissionActionsClient
                  submissionId={s.id}
                  email={s.email}
                  currentStatus={s.status}
                />
              </div>
            </details>
          ))}
        </div>
      </div>
    </DesktopShell>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mf-eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function ContactStatusPill({ status }: { status: string }) {
  const kind =
    status === 'NEW'
      ? 'warn'
      : status === 'INVITED' || status === 'COMPLETED'
        ? 'ok'
        : 'default';
  return (
    <span
      className={`mf-chip ${kind === 'warn' ? 'mf-chip-warn' : kind === 'ok' ? 'mf-chip-ok' : ''}`}
    >
      {status}
    </span>
  );
}

// Client island for the per-row action buttons
import SubmissionActionsClient from './submission-actions-client';
