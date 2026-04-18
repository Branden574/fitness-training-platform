import Link from 'next/link';
import { Mail, User } from 'lucide-react';
import { requireAdminSession, initialsFor, relativeShort } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';
import { Avatar, Btn, Chip, DesktopShell, StatCard, StatusDot } from '@/components/ui/mf';
import NewInvitationClient from './new-invitation-client';

export const dynamic = 'force-dynamic';

function expiryChipKind(status: string, expiresAt: Date): 'ok' | 'warn' | 'bad' | 'default' {
  if (status === 'ACCEPTED') return 'ok';
  if (status === 'EXPIRED' || status === 'CANCELLED') return 'bad';
  const ms = expiresAt.getTime() - Date.now();
  if (ms < 0) return 'bad';
  if (ms < 2 * 86400000) return 'warn';
  return 'default';
}

export default async function AdminInvitationsPage() {
  await requireAdminSession();

  const [invitations, stats] = await Promise.all([
    prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        inviter: { select: { id: true, name: true, email: true } },
      },
    }),
    Promise.all([
      prisma.invitation.count({ where: { status: 'PENDING' } }),
      prisma.invitation.count({ where: { status: 'ACCEPTED' } }),
      prisma.invitation.count({
        where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      }),
      prisma.invitation.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    ]).then(([pending, accepted, expired, sent30]) => ({ pending, accepted, expired, sent30 })),
  ]);

  const conversionRate =
    invitations.length > 0
      ? Math.round((stats.accepted / invitations.length) * 100)
      : 0;

  return (
    <DesktopShell
      role="admin"
      active="invitations"
      title="Invitations"
      breadcrumbs="ADMIN / INVITATIONS"
      headerRight={<NewInvitationClient />}
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Stat strip */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}
        >
          <StatCard
            label="PENDING"
            value={stats.pending}
            accent
            delta={stats.expired > 0 ? `${stats.expired} expired` : undefined}
          />
          <StatCard label="ACCEPTED" value={stats.accepted} />
          <StatCard label="CONVERSION" value={`${conversionRate}`} unit="%" />
          <StatCard label="SENT · 30D" value={stats.sent30} />
        </div>

        {/* Invitations table */}
        <div className="mf-card" style={{ overflow: 'hidden' }}>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1fr 1.2fr 1fr 80px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--mf-hairline)',
            }}
          >
            {['RECIPIENT', 'CODE', 'STATUS', 'INVITED BY', 'EXPIRES', ''].map((h, i) => (
              <div
                key={i}
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {h}
              </div>
            ))}
          </div>

          {invitations.length === 0 && (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: 48,
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              NO INVITATIONS SENT YET
            </div>
          )}

          {invitations.map((inv, i) => {
            const isExpired = inv.expiresAt < new Date() && inv.status === 'PENDING';
            const effectiveStatus = isExpired ? 'EXPIRED' : inv.status;
            return (
              <div
                key={inv.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr 1.2fr 1fr 80px',
                  padding: '12px 16px',
                  alignItems: 'center',
                  borderBottom: i < invitations.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                }}
              >
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <Avatar initials={initialsFor(null, inv.email)} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {inv.email}
                    </div>
                    {inv.phone && (
                      <div
                        className="mf-font-mono mf-fg-mute"
                        style={{ fontSize: 10 }}
                      >
                        {inv.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="mf-font-mono mf-tnum"
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.1em',
                  }}
                >
                  {inv.code}
                </div>
                <div className="flex items-center gap-2">
                  <Chip kind={expiryChipKind(effectiveStatus, inv.expiresAt)}>
                    {effectiveStatus}
                  </Chip>
                </div>
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <User size={12} className="mf-fg-mute" />
                  <span
                    style={{
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {inv.inviter.name ?? inv.inviter.email}
                  </span>
                </div>
                <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 11 }}>
                  {relativeShort(inv.expiresAt)}
                </div>
                <div className="flex justify-end">
                  <Link href={`/invite/${inv.code}`} target="_blank">
                    <Btn
                      variant="ghost"
                      icon={Mail}
                      style={{ height: 28, padding: '0 8px', fontSize: 11 }}
                    >
                      Link
                    </Btn>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mf-font-mono mf-fg-mute"
          style={{ fontSize: 10, marginTop: 12, letterSpacing: '0.1em' }}
        >
          SHOWING {invitations.length}{invitations.length === 200 ? '+ (CAPPED)' : ''} TOTAL
        </div>
      </div>
    </DesktopShell>
  );
}
