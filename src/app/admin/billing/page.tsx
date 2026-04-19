import { requireAdminSession } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';
import { isFlagEnabled } from '@/lib/feature-flags';
import {
  Btn,
  Chip,
  DesktopShell,
  StatCard,
} from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  await requireAdminSession();

  const subsEnabled = await isFlagEnabled('stripe_subscriptions');
  let subs: Array<{
    id: string;
    userId: string;
    plan: string | null;
    status: string | null;
    currentPeriodEnd: Date | null;
    user: { name: string | null; email: string };
  }> = [];
  if (subsEnabled) {
    try {
      subs = await prisma.subscription.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { name: true, email: true } } },
      });
    } catch {
      subs = [];
    }
  }

  const activeCount = subs.filter((s) => s.status === 'active').length;
  const pastDueCount = subs.filter((s) => s.status === 'past_due').length;

  return (
    <DesktopShell
      role="admin"
      active="billing"
      title="Billing"
      breadcrumbs="ADMIN / BILLING"
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Subscription banner — gated on stripe_subscriptions flag */}
        {subsEnabled ? (
          <div
            className="mf-card-elev"
            style={{
              padding: 16,
              marginBottom: 24,
              borderColor: 'var(--mf-accent)',
              background:
                'linear-gradient(180deg, rgba(255,77,28,0.06), transparent 50%)',
            }}
          >
            <div className="flex items-center justify-between" style={{ gap: 16 }}>
              <div>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <Chip kind="live">SUBSCRIPTIONS · LIVE</Chip>
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 18,
                    letterSpacing: '-0.01em',
                    textTransform: 'uppercase',
                  }}
                >
                  {subs.length} subscription{subs.length === 1 ? '' : 's'} total
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mf-card-elev"
            style={{
              padding: 16,
              marginBottom: 24,
              borderColor: 'var(--mf-amber)',
              background: 'rgba(245,181,68,0.06)',
            }}
          >
            <div className="flex items-center justify-between" style={{ gap: 16 }}>
              <div>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <Chip kind="warn">FLAG · STRIPE_SUBSCRIPTIONS OFF</Chip>
                </div>
                <div
                  className="mf-font-display"
                  style={{
                    fontSize: 18,
                    letterSpacing: '-0.01em',
                    textTransform: 'uppercase',
                  }}
                >
                  Subscriptions not live
                </div>
                <div
                  className="mf-fg-dim"
                  style={{ fontSize: 13, marginTop: 4, maxWidth: 640, lineHeight: 1.5 }}
                >
                  Toggle the <Chip>stripe_subscriptions</Chip> flag on{' '}
                  <Chip>/admin/audit</Chip> once Stripe products + webhook secret
                  are configured in env.
                </div>
              </div>
              <Btn>Configure Stripe</Btn>
            </div>
          </div>
        )}

        {/* Stat strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard label="ACTIVE SUBS" value={activeCount} accent />
          <StatCard label="PAST DUE" value={pastDueCount} />
          <StatCard label="TOTAL" value={subs.length} />
        </div>

        {/* Subscriptions table */}
        <div className="mf-card" style={{ padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="mf-eyebrow">RECENT SUBSCRIPTIONS</div>
            <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              {subs.length} TOTAL
            </span>
          </div>
          {subs.length === 0 ? (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: 24,
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: '0.1em',
              }}
            >
              NO SUBSCRIPTIONS YET
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {subs.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
                    gap: 12,
                    padding: '10px 0',
                    alignItems: 'center',
                    borderBottom:
                      i < subs.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {s.user.name ?? s.user.email}
                  </div>
                  <div
                    className="mf-font-mono mf-fg-dim"
                    style={{ fontSize: 11, textTransform: 'uppercase' }}
                  >
                    {s.plan ?? '—'}
                  </div>
                  <div>
                    <Chip
                      kind={
                        s.status === 'active'
                          ? 'ok'
                          : s.status === 'past_due'
                            ? 'warn'
                            : 'bad'
                      }
                    >
                      {(s.status ?? 'unknown').toUpperCase()}
                    </Chip>
                  </div>
                  <div
                    className="mf-font-mono mf-fg-dim"
                    style={{ fontSize: 11, textAlign: 'right' }}
                  >
                    {s.currentPeriodEnd
                      ? `renews ${s.currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DesktopShell>
  );
}
