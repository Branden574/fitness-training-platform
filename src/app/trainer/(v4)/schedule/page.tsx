import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import ScheduleDesktop from './schedule-desktop';
import ScheduleMobile from './schedule-mobile';

export const dynamic = 'force-dynamic';

function startOfWeek(d = new Date()): Date {
  const s = new Date(d);
  const day = s.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  s.setDate(s.getDate() + diff);
  s.setHours(0, 0, 0, 0);
  return s;
}

export default async function TrainerSchedulePage() {
  const session = await requireTrainerSession();

  const weekStart = startOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const [appointments, clients] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        trainerId: session.user.id,
        startTime: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { startTime: 'asc' },
      include: { client: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.user.findMany({
      where: { trainerId: session.user.id, role: 'CLIENT' },
      select: { id: true, name: true, email: true, image: true },
    }),
  ]);

  return (
    <>
      <ScheduleMobile
        appointments={appointments}
        clients={clients}
        weekStart={weekStart}
        weekEnd={weekEnd}
      />
      <ScheduleDesktop
        appointments={appointments}
        clients={clients}
        weekStart={weekStart}
        weekEnd={weekEnd}
      />
    </>
  );
}
