import { requireClientSession, startOfToday } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import FoodClient from './food-client';

export const dynamic = 'force-dynamic';

const MEALS = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] as const;

async function getFoodData(userId: string) {
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [entries, mealPlan, trainer] = await Promise.all([
    prisma.foodEntry.findMany({
      where: { userId, date: { gte: today, lt: tomorrow } },
      orderBy: [{ mealType: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.mealPlan.findFirst({
      where: {
        userId,
        startDate: { lte: today },
        endDate: { gte: today },
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

export default async function ClientFoodPage() {
  const session = await requireClientSession();
  const data = await getFoodData(session.user.id);

  return <FoodClient initial={data} />;
}
