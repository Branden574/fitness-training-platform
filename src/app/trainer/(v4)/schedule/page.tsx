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

  const [appointments, clients, pendingRequests] = await Promise.all([
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
    // All PENDING requests for this trainer, not bounded by week — a client
    // could request a session weeks in advance and we still need to surface
    // it for approval.
    prisma.appointment.findMany({
      where: { trainerId: session.user.id, status: 'PENDING' },
      orderBy: { startTime: 'asc' },
      include: { client: { select: { id: true, name: true, email: true, image: true } } },
    }),
  ]);

  const pendingRequestsSerialized = pendingRequests.map((r) => ({
    id: r.id,
    title: r.title,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime.toISOString(),
    duration: r.duration,
    location: r.location,
    notes: r.notes,
    client: r.client,
  }));

  return (
    <>
      <ScheduleMobile
        appointments={appointments}
        clients={clients}
        weekStart={weekStart}
        weekEnd={weekEnd}
        pendingRequests={pendingRequestsSerialized}
      />
      <ScheduleDesktop
        appointments={appointments}
        clients={clients}
        weekStart={weekStart}
        weekEnd={weekEnd}
        pendingRequests={pendingRequestsSerialized}
      />
    </>
  );
}
