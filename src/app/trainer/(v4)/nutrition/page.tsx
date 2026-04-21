import Link from 'next/link';
import { MessageSquare, Edit, Plus } from 'lucide-react';
import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { formatTimeInZone } from '@/lib/formatTime';
import {
  Avatar,
  Bar,
  Btn,
  Chip,
  DesktopShell,
  StatCard,
  SrcPill,
} from '@/components/ui/mf';
import AssignMealPlanClient from './assign-meal-plan-client';

export const dynamic = 'force-dynamic';

interface SearchParams {
  client?: string;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TrainerNutritionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireTrainerSession();
  const sp = await searchParams;
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const clients = await prisma.user.findMany({
    where: { trainerId: session.user.id, role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      email: true,
      timezone: true,
      mealPlans: {
        where: {
          startDate: { lte: today },
          endDate: { gte: today },
        },
        orderBy: { startDate: 'desc' },
        take: 1,
        select: {
          id: true,
          name: true,
          dailyCalorieTarget: true,
          dailyProteinTarget: true,
          dailyCarbTarget: true,
          dailyFatTarget: true,
        },
      },
      foodEntries: {
        where: { date: { gte: today, lt: tomorrow } },
        select: { calories: true, protein: true, carbs: true, fat: true, createdAt: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rail = clients.map((c) => {
    const plan = c.mealPlans[0];
    const totals = c.foodEntries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    const adherence = plan
      ? Math.min(100, Math.round((totals.calories / plan.dailyCalorieTarget) * 100))
      : 0;
    const lastLog =
      c.foodEntries.length > 0
        ? c.foodEntries
            .map((e) => e.createdAt)
            .sort((a, b) => b.getTime() - a.getTime())[0]
        : null;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      timezone: c.timezone,
      initials: initialsFor(c.name, c.email),
      plan,
      adherence,
      totals,
      lastLog,
    };
  });

  const activeId = sp.client && rail.some((r) => r.id === sp.client) ? sp.client : rail[0]?.id ?? null;
  const active = rail.find((r) => r.id === activeId) ?? null;

  // Pull meal plan details for active client if they have one
  let meals: Array<{
    id: string;
    name: string;
    type: string;
    items: Array<{
      id: string;
      name: string;
      brand: string | null;
      quantity: number;
      unit: string;
      kcal: number;
      p: number;
      c: number;
      f: number;
    }>;
  }> = [];
  let todaysLog: Array<{
    id: string;
    mealType: string;
    name: string;
    qty: string;
    time: string;
    kcal: number;
    p: number;
    c: number;
    f: number;
  }> = [];

  if (active?.plan?.id) {
    const fullPlan = await prisma.mealPlan.findUnique({
      where: { id: active.plan.id },
      include: {
        meals: {
          include: {
            items: { include: { food: true } },
          },
        },
      },
    });
    if (fullPlan) {
      meals = fullPlan.meals.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        items: m.items.map((it) => ({
          id: it.id,
          name: it.food.name,
          brand: it.food.brand,
          quantity: it.quantity,
          unit: it.food.servingUnit,
          kcal: Math.round(it.food.caloriesPerServing * it.quantity),
          p: Math.round(it.food.protein * it.quantity),
          c: Math.round(it.food.carbs * it.quantity),
          f: Math.round(it.food.fat * it.quantity),
        })),
      }));
    }
  }

  if (active) {
    const entries = await prisma.foodEntry.findMany({
      where: {
        userId: active.id,
        date: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: 'asc' },
    });
    todaysLog = entries.map((e) => ({
      id: e.id,
      mealType: e.mealType,
      name: e.foodName,
      qty: `${e.quantity} ${e.unit}`,
      // Format in the CLIENT's timezone so "7:30 AM breakfast" reads
      // correctly to the trainer regardless of where either of them is.
      time: formatTimeInZone(e.createdAt, active.timezone),
      kcal: Math.round(e.calories),
      p: Math.round(e.protein),
      c: Math.round(e.carbs),
      f: Math.round(e.fat),
    }));
  }

  return (
    <DesktopShell
      role="trainer"
      active="nutrition"
      title="Nutrition"
      breadcrumbs="COACHING · NUTRITION"
      headerRight={
        <AssignMealPlanClient
          clients={rail.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
          defaultClientId={activeId}
        />
      }
    >
      <div className="flex flex-col md:flex-row md:h-full md:overflow-hidden">
        {/* Client rail — sidebar on desktop, scrollable strip on mobile */}
        <div
          className="mf-s1 shrink-0 flex flex-col w-full md:w-[280px] md:border-r md:max-h-none max-h-[240px]"
          style={{ borderBottom: '1px solid var(--mf-hairline)', borderRightColor: 'var(--mf-hairline)' }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--mf-hairline)',
            }}
          >
            <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
              CLIENT NUTRITION · {rail.length}
            </div>
            <input
              className="mf-input"
              placeholder="Filter…"
              style={{ height: 32, fontSize: 12 }}
            />
          </div>
          <div className="mf-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {rail.length === 0 && (
              <div
                className="mf-fg-mute mf-font-mono"
                style={{ padding: 24, textAlign: 'center', fontSize: 11, letterSpacing: '0.1em' }}
              >
                NO CLIENTS YET
              </div>
            )}
            {rail.map((r) => {
              const sel = r.id === activeId;
              const adhCol =
                r.adherence >= 85
                  ? 'var(--mf-green)'
                  : r.adherence >= 70
                    ? 'var(--mf-amber)'
                    : r.adherence > 0
                      ? 'var(--mf-red)'
                      : 'var(--mf-fg-mute)';
              return (
                <Link
                  key={r.id}
                  href={`/trainer/nutrition?client=${r.id}`}
                  className="flex items-center gap-3"
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--mf-hairline)',
                    background: sel ? 'var(--mf-surface-3)' : 'transparent',
                    position: 'relative',
                  }}
                >
                  {sel && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 2,
                        background: 'var(--mf-accent)',
                      }}
                    />
                  )}
                  <Avatar initials={r.initials} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.name ?? r.email}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{
                        fontSize: 9,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.plan ? `${r.plan.name} · ${r.plan.dailyCalorieTarget} KCAL` : 'No plan'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      className="mf-font-display mf-tnum"
                      style={{ fontSize: 13, lineHeight: 1, color: adhCol }}
                    >
                      {r.plan ? `${r.adherence}%` : '—'}
                    </div>
                    <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 8, textTransform: 'uppercase' }}>
                      ADH
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Detail pane */}
        <div className="mf-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {!active ? (
            <div
              className="mf-fg-mute mf-font-mono"
              style={{
                padding: 48,
                textAlign: 'center',
                fontSize: 12,
                letterSpacing: '0.1em',
              }}
            >
              SELECT A CLIENT FROM THE RAIL
            </div>
          ) : (
            <>
              <div
                className="mf-s1"
                style={{
                  padding: '20px 24px 0',
                  borderBottom: '1px solid var(--mf-hairline)',
                }}
              >
                <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                  <Avatar initials={active.initials} size={42} active />
                  <div>
                    <div
                      className="mf-font-display"
                      style={{ fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1 }}
                    >
                      {active.name ?? active.email}
                    </div>
                    <div
                      className="mf-font-mono mf-fg-mute"
                      style={{ fontSize: 10, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                    >
                      {active.plan?.name ?? 'NO PLAN ASSIGNED'}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {active.plan && (
                      <Chip
                        kind={
                          active.adherence >= 85
                            ? 'ok'
                            : active.adherence >= 70
                              ? 'warn'
                              : 'bad'
                        }
                      >
                        {active.adherence}% ADHERENCE
                      </Chip>
                    )}
                    <Link href={`/trainer/messages?with=${active.id}`}>
                      <Btn icon={MessageSquare}>Message</Btn>
                    </Link>
                    <Btn icon={Edit}>Edit plan</Btn>
                  </div>
                </div>
                <div
                  className="flex gap-1"
                  style={{ borderBottom: '0' }}
                >
                  {(['MEAL PLAN', 'TODAY\'S LOG'] as const).map((t, i) => (
                    <div
                      key={t}
                      className="mf-font-mono"
                      style={{
                        padding: '10px 16px',
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: i === 0 ? 'var(--mf-fg)' : 'var(--mf-fg-mute)',
                        position: 'relative',
                      }}
                    >
                      {t}
                      {i === 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: -1,
                            left: 12,
                            right: 12,
                            height: 2,
                            background: 'var(--mf-accent)',
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: 24 }}>
                {active.plan ? (
                  <>
                    {/* Targets row */}
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4" style={{ marginBottom: 24 }}>
                      <StatCard
                        label="DAILY CALORIES"
                        value={active.plan.dailyCalorieTarget.toLocaleString()}
                        delta={`${Math.round(active.totals.calories)} eaten`}
                      />
                      <StatCard
                        label="PROTEIN"
                        value={`${active.plan.dailyProteinTarget}`}
                        unit="G"
                        delta={`${Math.round(active.totals.protein)}G eaten`}
                      />
                      <StatCard
                        label="CARBS"
                        value={`${active.plan.dailyCarbTarget}`}
                        unit="G"
                        delta={`${Math.round(active.totals.carbs)}G eaten`}
                      />
                      <StatCard
                        label="FAT"
                        value={`${active.plan.dailyFatTarget}`}
                        unit="G"
                        delta={`${Math.round(active.totals.fat)}G eaten`}
                      />
                    </div>

                    {/* Meal plan template */}
                    {meals.length > 0 && (
                      <div className="mf-card-elev" style={{ marginBottom: 24 }}>
                        <div
                          className="flex items-center justify-between"
                          style={{
                            padding: '12px 20px',
                            borderBottom: '1px solid var(--mf-hairline)',
                          }}
                        >
                          <div>
                            <div className="mf-font-display" style={{ fontSize: 15 }}>
                              MEAL TEMPLATE
                            </div>
                            <div
                              className="mf-font-mono mf-fg-mute"
                              style={{
                                fontSize: 10,
                                marginTop: 2,
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {meals.length} MEALS · {meals.reduce((s, m) => s + m.items.length, 0)} ITEMS
                            </div>
                          </div>
                          <Btn icon={Edit}>Edit</Btn>
                        </div>
                        {meals.map((m) => {
                          const mealKcal = m.items.reduce((s, it) => s + it.kcal, 0);
                          return (
                            <div key={m.id} style={{ borderBottom: '1px solid var(--mf-hairline)' }}>
                              <div
                                className="mf-s2 flex items-center gap-3"
                                style={{ padding: '8px 20px' }}
                              >
                                <span
                                  style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--mf-accent)' }}
                                />
                                <div className="mf-font-display" style={{ fontSize: 13 }}>
                                  {m.name}
                                </div>
                                <div className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                                  {m.type} · {m.items.length} ITEMS
                                </div>
                                <div className="ml-auto flex items-center gap-3">
                                  <span
                                    className="mf-font-display mf-tnum"
                                    style={{ fontSize: 14 }}
                                  >
                                    {mealKcal}
                                  </span>
                                  <span className="mf-font-mono mf-fg-mute" style={{ fontSize: 10 }}>
                                    KCAL
                                  </span>
                                </div>
                              </div>
                              {m.items.map((it, i) => (
                                <div
                                  key={it.id}
                                  className="flex items-center gap-2"
                                  style={{
                                    padding: '8px 20px',
                                    fontSize: 12,
                                    borderBottom:
                                      i < m.items.length - 1
                                        ? '1px solid var(--mf-hairline)'
                                        : 'none',
                                  }}
                                >
                                  <span style={{ flex: 1 }}>{it.name}</span>
                                  <span
                                    className="mf-font-mono mf-fg-dim"
                                    style={{ fontSize: 10, width: 96, textAlign: 'right' }}
                                  >
                                    {it.quantity} {it.unit}
                                  </span>
                                  <span
                                    className="mf-font-display mf-tnum"
                                    style={{ width: 40, textAlign: 'right' }}
                                  >
                                    {it.kcal}
                                  </span>
                                  <span
                                    className="mf-font-mono mf-tnum"
                                    style={{ fontSize: 10, width: 32, textAlign: 'right', color: '#FF4D1C' }}
                                  >
                                    {it.p}P
                                  </span>
                                  <span
                                    className="mf-font-mono mf-tnum"
                                    style={{ fontSize: 10, width: 32, textAlign: 'right', color: '#4D9EFF' }}
                                  >
                                    {it.c}C
                                  </span>
                                  <span
                                    className="mf-font-mono mf-tnum"
                                    style={{ fontSize: 10, width: 32, textAlign: 'right', color: '#F5B544' }}
                                  >
                                    {it.f}F
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div
                    className="mf-card"
                    style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}
                  >
                    <div className="mf-eyebrow" style={{ marginBottom: 8 }}>NO PLAN ASSIGNED</div>
                    <div className="mf-fg-dim" style={{ fontSize: 13, marginBottom: 16 }}>
                      {active.name ?? 'This client'} doesn&apos;t have an active meal plan.
                    </div>
                    <Btn variant="primary" icon={Plus}>Assign a plan</Btn>
                  </div>
                )}

                {/* Today's log */}
                <div className="mf-eyebrow" style={{ marginBottom: 8 }}>
                  TODAY&apos;S LOG
                </div>
                <div className="mf-card" style={{ overflow: 'hidden' }}>
                  {todaysLog.length === 0 && (
                    <div
                      className="mf-fg-mute mf-font-mono"
                      style={{
                        padding: 24,
                        textAlign: 'center',
                        fontSize: 11,
                        letterSpacing: '0.1em',
                      }}
                    >
                      NOT YET LOGGED TODAY
                    </div>
                  )}
                  {todaysLog.map((e, i) => (
                    <div
                      key={e.id}
                      className="flex items-center gap-3"
                      style={{
                        padding: '10px 16px',
                        borderBottom:
                          i < todaysLog.length - 1
                            ? '1px solid var(--mf-hairline)'
                            : 'none',
                        fontSize: 12,
                      }}
                    >
                      <span
                        className="mf-font-mono mf-fg-mute"
                        style={{ fontSize: 10, width: 64, textTransform: 'uppercase' }}
                      >
                        {e.mealType}
                      </span>
                      <span
                        className="mf-font-mono mf-fg-dim mf-tnum"
                        style={{ fontSize: 10, width: 68 }}
                        title={
                          active?.timezone
                            ? `Logged in ${active.timezone}`
                            : 'Timezone not set — shown in server time'
                        }
                      >
                        {e.time}
                      </span>
                      <span style={{ flex: 1 }}>{e.name}</span>
                      <span
                        className="mf-font-mono mf-fg-mute"
                        style={{ fontSize: 10, width: 80, textAlign: 'right' }}
                      >
                        {e.qty}
                      </span>
                      <span
                        className="mf-font-display mf-tnum"
                        style={{ width: 48, textAlign: 'right' }}
                      >
                        {e.kcal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DesktopShell>
  );
}
