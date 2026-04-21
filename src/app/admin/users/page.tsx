import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdminSession, initialsFor, relativeShort } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';
import {
  Avatar,
  Btn,
  Chip,
  DesktopShell,
  StatusDot,
  type StatusDotKind,
} from '@/components/ui/mf';
import AdminUsersFilterClient from './users-filter-client';
import TrainerPublishClient from './trainer-publish-client';
import TrainerPricingClient from './trainer-pricing-client';
import UserRowMenuClient from './user-row-menu-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  role?: string;
  q?: string;
}

function userStatus(isActive: boolean, lastLogin: Date | null, createdAt: Date): StatusDotKind {
  if (!isActive) return 'paused';
  const weekOld = Date.now() - createdAt.getTime() < 14 * 86400000;
  if (!lastLogin) return weekOld ? 'new' : 'behind';
  const diff = Date.now() - lastLogin.getTime();
  if (diff > 7 * 86400000) return 'behind';
  if (weekOld) return 'new';
  return 'active';
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminSession();
  const sp = await searchParams;
  const role = (sp.role ?? '').toUpperCase();
  const q = (sp.q ?? '').trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      ...(role === 'CLIENT' || role === 'TRAINER' || role === 'ADMIN' ? { role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLogin: true,
      loginCount: true,
      trainerIsPublic: true,
      trainerSlug: true,
      trainer: {
        select: {
          subscriptionTier: true,
          monthlyPrice: true,
          subscriptionStatus: true,
        },
      },
      _count: {
        select: {
          workoutSessions: true,
          foodEntries: true,
          progressEntries: true,
        },
      },
    },
    take: 200,
  });

  const [counts, pendingInvitations] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.invitation.count({ where: { status: 'PENDING' } }),
  ]);

  const byRole = Object.fromEntries(counts.map((c) => [c.role, c._count._all])) as Record<
    string,
    number
  >;
  const total = Object.values(byRole).reduce((a, b) => a + b, 0);

  const filterTabs: Array<{ key: string; label: string; count: number }> = [
    { key: '', label: 'ALL', count: total },
    { key: 'CLIENT', label: 'CLIENT', count: byRole.CLIENT ?? 0 },
    { key: 'TRAINER', label: 'TRAINER', count: byRole.TRAINER ?? 0 },
    { key: 'ADMIN', label: 'ADMIN', count: byRole.ADMIN ?? 0 },
  ];

  return (
    <DesktopShell
      role="admin"
      active="users"
      title="Users"
      breadcrumbs="ADMIN / USERS"
      headerRight={
        <Link href="/admin/invitations">
          <Btn variant="primary" icon={Plus}>Invite</Btn>
        </Link>
      }
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Search + filter row */}
        <AdminUsersFilterClient
          currentRole={role}
          currentQuery={sp.q ?? ''}
          filterTabs={filterTabs}
          pendingInvitations={pendingInvitations}
        />

        {/* Users table */}
        <div className="mf-card" style={{ overflow: 'hidden', marginTop: 16 }}>
          <div
            className="mf-font-mono mf-fg-mute"
            style={{
              display: 'grid',
              gridTemplateColumns: '2.3fr 0.9fr 1fr 1.2fr 1fr 110px 140px 60px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--mf-hairline)',
            }}
          >
            {['USER', 'ROLE', 'STATUS', 'JOINED', 'ACTIVITY', 'VISIBILITY', 'PRICING', ''].map((h, i) => (
              <div
                key={i}
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {h}
              </div>
            ))}
          </div>
          {users.length === 0 && (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: 48,
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              NO USERS MATCHING FILTER
            </div>
          )}
          {users.map((u, i) => {
            const status = userStatus(u.isActive, u.lastLogin, u.createdAt);
            const totalActivity =
              u._count.workoutSessions + u._count.foodEntries + u._count.progressEntries;
            return (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.3fr 0.9fr 1fr 1.2fr 1fr 110px 140px 60px',
                  padding: '12px 16px',
                  alignItems: 'center',
                  borderBottom: i < users.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                }}
              >
                <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                  <Avatar initials={initialsFor(u.name, u.email)} size={30} />
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
                      {u.name ?? '(No name)'}
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
                      {u.email}
                    </div>
                  </div>
                </div>
                <div>
                  <Chip>{u.role}</Chip>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot kind={status} />
                  <span
                    className="mf-font-mono mf-fg-dim"
                    style={{
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {status}
                  </span>
                </div>
                <div className="mf-font-mono mf-fg-dim mf-tnum" style={{ fontSize: 11 }}>
                  {u.createdAt.toISOString().slice(0, 10)}
                </div>
                <div className="mf-font-mono mf-fg-dim" style={{ fontSize: 11 }}>
                  {totalActivity > 0 ? `${totalActivity} logs · ${relativeShort(u.lastLogin)}` : relativeShort(u.lastLogin)}
                </div>
                <div>
                  {u.role === 'TRAINER' ? (
                    <TrainerPublishClient
                      userId={u.id}
                      initialPublic={u.trainerIsPublic}
                    />
                  ) : (
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, letterSpacing: '0.1em' }}
                    >
                      —
                    </span>
                  )}
                </div>
                <div>
                  {u.role === 'TRAINER' ? (
                    <TrainerPricingClient
                      userId={u.id}
                      initialTier={
                        (u.trainer?.subscriptionTier ?? null) as
                          | 'FREE'
                          | 'STARTER'
                          | 'PRO'
                          | 'CUSTOM'
                          | null
                      }
                      initialPrice={u.trainer?.monthlyPrice ?? null}
                      initialStatus={u.trainer?.subscriptionStatus ?? null}
                    />
                  ) : (
                    <span
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, letterSpacing: '0.1em' }}
                    >
                      —
                    </span>
                  )}
                </div>
                <div className="flex justify-end">
                  <UserRowMenuClient
                    userId={u.id}
                    userEmail={u.email}
                    userName={u.name}
                    userRole={u.role}
                    isActive={u.isActive}
                    trainerSlug={u.trainerSlug}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mf-font-mono mf-fg-mute"
          style={{ fontSize: 10, marginTop: 12, letterSpacing: '0.1em' }}
        >
          SHOWING {users.length}{users.length === 200 ? '+ (CAPPED)' : ''} OF {total.toLocaleString()}
        </div>
      </div>
    </DesktopShell>
  );
}
