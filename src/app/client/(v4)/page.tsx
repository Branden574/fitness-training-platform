import { requireClientSession, getClientContext, startOfToday, startOfWeek } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import TodayMobile, { type TodayData } from './today-mobile';
import TodayDesktop from './today-desktop';

export const dynamic = 'force-dynamic';

async function getTodayData(userId: string): Promise<TodayData> {
  const today = startOfToday();
  const weekStart = startOfWeek();
  const thirty = new Date();
  thirty.setDate(thirty.getDate() - 30);

  const [nextSession, weekSessions, streakSessions, bodyWeight, coachNote] = await Promise.all([
    // The most recent not-completed session, else the most recent completed one
    prisma.workoutSession.findFirst({
      where: { userId, completed: false },
      orderBy: { startTime: 'desc' },
      include: {
        workout: {
          include: {
            exercises: {
              orderBy: { order: 'asc' },
              include: { exercise: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    // This week's completed sessions count
    prisma.workoutSession.count({
      where: {
        userId,
        completed: true,
        startTime: { gte: weekStart },
      },
    }),
    // For streak: last 30 days of completed sessions
    prisma.workoutSession.findMany({
      where: {
        userId,
        completed: true,
        startTime: { gte: thirty },
      },
      select: { startTime: true },
      orderBy: { startTime: 'desc' },
    }),
    // Latest body weight entry
    prisma.progressEntry.findFirst({
      where: { userId, weight: { not: null } },
      orderBy: { date: 'desc' },
      select: { weight: true, date: true },
    }),
    // Latest message from the trainer
    prisma.message.findFirst({
      where: { receiverId: userId },
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, name: true, role: true } } },
    }),
  ]);

  const streak = computeStreak(streakSessions.map((s) => s.startTime));
  const weekDaysDone = computeWeekDays(streakSessions.map((s) => s.startTime), weekStart);

  // 30-day old weight for the trend delta
  let trendDelta: string | null = null;
  if (bodyWeight?.weight) {
    const old = await prisma.progressEntry.findFirst({
      where: { userId, weight: { not: null }, date: { lte: thirty } },
      orderBy: { date: 'desc' },
      select: { weight: true },
    });
    if (old?.weight) {
      const diff = bodyWeight.weight - old.weight;
      if (Math.abs(diff) >= 0.1) {
        const sign = diff > 0 ? '▲' : '▼';
        trendDelta = `${sign} ${Math.abs(diff).toFixed(1)} LB / 30D`;
      }
    }
  }

  return {
    nextSession,
    weekSessions,
    weekDaysDone,
    streak,
    bodyWeight: bodyWeight?.weight ?? null,
    trendDelta,
    coachNote: coachNote?.sender.role === 'TRAINER' ? coachNote : null,
    today,
  };
}

function computeStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = new Set<string>();
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10);
    days.add(key);
  }
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeWeekDays(dates: Date[], weekStart: Date): boolean[] {
  const keys = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return keys.has(d.toISOString().slice(0, 10));
  });
}

export default async function ClientTodayPage() {
  const session = await requireClientSession();
  const [ctx, data] = await Promise.all([
    getClientContext(session.user.id),
    getTodayData(session.user.id),
  ]);

  return (
    <>
      <TodayMobile ctx={ctx} data={data} />
      <TodayDesktop ctx={ctx} data={data} />
    </>
  );
}
