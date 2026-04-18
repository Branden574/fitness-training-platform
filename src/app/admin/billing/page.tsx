import { requireAdminSession, initialsFor, relativeShort } from '@/lib/admin-data';
import { prisma } from '@/lib/prisma';
import {
  BarChart,
  Btn,
  Chip,
  DesktopShell,
  StatCard,
} from '@/components/ui/mf';

export const dynamic = 'force-dynamic';

function centsToDollars(cents: number): number {
  return cents / 100;
}

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export default async function AdminBillingPage() {
  await requireAdminSession();

  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);
  const twelveWks = new Date();
  twelveWks.setDate(twelveWks.getDate() - 12 * 7);

  // Shop revenue (only thing Stripe-wired today)
  const [ordersThisMonth, recentOrders, weeklyOrders, failedOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: thirty },
        paymentStatus: 'PAID',
      },
      select: { total: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: twelveWks }, paymentStatus: 'PAID' },
      select: { total: true, createdAt: true },
    }),
    prisma.order.count({
      where: {
        paymentStatus: { in: ['FAILED', 'REFUNDED'] },
        createdAt: { gte: thirty },
      },
    }),
  ]);

  const monthlyShopRevenueCents = ordersThisMonth.reduce((a, o) => a + o.total, 0);
  const monthlyShopRevenue = centsToDollars(monthlyShopRevenueCents);

  // 12w weekly bars (shop revenue only)
  const weekStart = startOfWeek();
  const weeklyBuckets: number[] = Array(12).fill(0);
  for (const o of weeklyOrders) {
    const diff = Math.floor((weekStart.getTime() - o.createdAt.getTime()) / 86400000);
    const weeksAgo = Math.floor(diff / 7);
    if (weeksAgo < 0 || weeksAgo > 11) continue;
    weeklyBuckets[11 - weeksAgo]! += centsToDollars(o.total);
  }

  const totalLast12 = weeklyBuckets.reduce((a, b) => a + b, 0);

  return (
    <DesktopShell
      role="admin"
      active="billing"
      title="Billing"
      breadcrumbs="ADMIN / BILLING"
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Gated banner: subscription plans not live yet */}
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
                style={{ fontSize: 18, letterSpacing: '-0.01em', textTransform: 'uppercase' }}
              >
                Subscription plans pending
              </div>
              <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 4, maxWidth: 640, lineHeight: 1.5 }}>
                The Self-led / Coached / Team plans marketed on the landing page aren&apos;t wired
                to Stripe yet. Only shop checkout is live — numbers below reflect one-time
                merchandise orders, not recurring revenue.
              </div>
            </div>
            <Btn>Configure Stripe</Btn>
          </div>
        </div>

        {/* Stat strip (shop only) */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}
        >
          <StatCard
            label="SHOP REVENUE · 30D"
            value={fmt(monthlyShopRevenue)}
            accent
            delta={ordersThisMonth.length > 0 ? `${ordersThisMonth.length} paid orders` : undefined}
          />
          <StatCard
            label="12W TOTAL · SHOP"
            value={fmt(totalLast12)}
          />
          <StatCard
            label="PAID ORDERS · 30D"
            value={ordersThisMonth.length}
          />
          <StatCard
            label="FAILED / REFUNDED"
            value={failedOrders}
          />
        </div>

        {/* Chart */}
        <div className="mf-card" style={{ padding: 20, marginBottom: 24 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <div>
              <div className="mf-eyebrow">SHOP REVENUE · 12 WK</div>
              <div
                className="mf-font-display mf-tnum"
                style={{ fontSize: 32, lineHeight: 1, marginTop: 4 }}
              >
                {fmt(totalLast12)}
              </div>
            </div>
            <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              WEEKLY · USD
            </div>
          </div>
          {weeklyBuckets.some((v) => v > 0) ? (
            <BarChart
              data={weeklyBuckets}
              labels={Array.from({ length: 12 }, (_, i) => `W${i + 1}`)}
              h={180}
              accent
            />
          ) : (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{ padding: 48, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
            >
              NO SHOP ORDERS IN LAST 12 WEEKS
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="mf-card" style={{ padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <div className="mf-eyebrow">RECENT ORDERS</div>
            <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
              {recentOrders.length} LATEST
            </span>
          </div>
          {recentOrders.length === 0 ? (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
            >
              NO ORDERS YET
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentOrders.map((o, i) => (
                <div
                  key={o.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1.5fr 1fr 1fr 120px',
                    gap: 12,
                    padding: '10px 0',
                    alignItems: 'center',
                    borderBottom: i < recentOrders.length - 1 ? '1px solid var(--mf-hairline)' : 'none',
                  }}
                >
                  <div className="mf-font-mono mf-fg-mute mf-tnum" style={{ fontSize: 11 }}>
                    {o.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {o.user ? o.user.name ?? o.user.email : 'Guest'}
                  </div>
                  <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10, textTransform: 'uppercase' }}>
                    SHOP · {o.status}
                  </div>
                  <div>
                    <Chip
                      kind={
                        o.paymentStatus === 'PAID'
                          ? 'ok'
                          : o.paymentStatus === 'FAILED' || o.paymentStatus === 'REFUNDED'
                            ? 'bad'
                            : 'warn'
                      }
                    >
                      {o.paymentStatus}
                    </Chip>
                  </div>
                  <div
                    className="mf-font-display mf-tnum"
                    style={{
                      fontSize: 14,
                      textAlign: 'right',
                      color: o.paymentStatus === 'FAILED' ? 'var(--mf-red)' : 'var(--mf-fg)',
                    }}
                  >
                    {o.paymentStatus === 'FAILED' ? '−' : '+'}
                    {fmt(centsToDollars(o.total))}
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
