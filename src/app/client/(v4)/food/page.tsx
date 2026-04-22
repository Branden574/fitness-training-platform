import { requireClientSession, getClientContext, startOfToday } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import FoodClient from './food-client';
import FoodDesktop from './food-desktop';

export const dynamic = 'force-dynamic';

const MEALS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateParam(raw: string | undefined): Date {
  if (!raw) return startOfToday();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return startOfToday();
  const parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  parsed.setHours(0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return startOfToday();
  const today = startOfToday();
  if (parsed.getTime() > today.getTime()) return today;
  return parsed;
}

async function getFoodData(userId: string, viewDate: Date) {
  const dayStart = new Date(viewDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  const [entries, mealPlan, trainer] = await Promise.all([
    prisma.foodEntry.findMany({
      where: { userId, date: { gte: dayStart, lt: dayEnd } },
      orderBy: [{ mealType: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.mealPlan.findFirst({
      where: {
        userId,
        startDate: { lte: dayStart },
        endDate: { gte: dayStart },
      },
      orderBy: { startDate: 'desc' },
      include: { trainer: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { assignedTrainer: { select: { id: true, name: true } } },
    }),
  ]);

  const totals = entries.reduce(
    (acc, e) => {
      acc.calories += e.calories;
      acc.protein += e.protein;
      acc.carbs += e.carbs;
      acc.fat += e.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const target = mealPlan
    ? {
        calories: mealPlan.dailyCalorieTarget,
        protein: mealPlan.dailyProteinTarget,
        carbs: mealPlan.dailyCarbTarget,
        fat: mealPlan.dailyFatTarget,
      }
    : { calories: 2400, protein: 160, carbs: 260, fat: 70 };

  const grouped = Object.fromEntries(
    MEALS.map((m) => [
      m,
      entries
        .filter((e) => e.mealType === m)
        .map((e) => ({
          id: e.id,
          name: e.foodName,
          qty: `${e.quantity} ${e.unit}`,
          // Raw values so the edit modal can populate numeric inputs and
          // POST the exact shape /api/food-entries expects on save.
          quantity: e.quantity,
          unit: e.unit,
          calories: e.calories,
          rawProtein: e.protein,
          rawCarbs: e.carbs,
          rawFat: e.fat,
          mealType: e.mealType,
          kcal: Math.round(e.calories),
          protein: Math.round(e.protein),
          carbs: Math.round(e.carbs),
          fat: Math.round(e.fat),
          time: e.createdAt.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
        })),
    ]),
  );

  return {
    totals,
    target,
    grouped,
    planName: mealPlan?.name ?? null,
    trainerName: mealPlan?.trainer.name ?? trainer?.assignedTrainer?.name ?? null,
  };
}

interface SearchParams {
  date?: string;
}

export default async function ClientFoodPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireClientSession();
  const sp = await searchParams;
  const viewDate = parseDateParam(sp.date);
  const dateStr = toLocalDateStr(viewDate);
  const todayStr = toLocalDateStr(startOfToday());
  const isToday = dateStr === todayStr;

  const [ctx, data] = await Promise.all([
    getClientContext(session.user.id),
    getFoodData(session.user.id, viewDate),
  ]);

  const prevDate = new Date(viewDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(viewDate);
  nextDate.setDate(nextDate.getDate() + 1);

  return (
    <>
      <FoodClient
        initial={data}
        viewDate={dateStr}
        prevDate={toLocalDateStr(prevDate)}
        todayDate={todayStr}
      />
      <FoodDesktop
        ctx={ctx}
        initial={data}
        viewDate={dateStr}
        prevDate={toLocalDateStr(prevDate)}
        nextDate={isToday ? null : toLocalDateStr(nextDate)}
        todayDate={todayStr}
      />
    </>
  );
}
