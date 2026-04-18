import { requireTrainerSession } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import ProgramsDesktop from './programs-desktop';
import ProgramsMobile from './programs-mobile';

export const dynamic = 'force-dynamic';

export default async function TrainerBuilderPage() {
  const session = await requireTrainerSession();

  const [programs, exerciseCount, totalAssignments] = await Promise.all([
    prisma.program.findMany({
      where: {
        archived: false,
        ...(session.user.role === 'ADMIN' ? {} : { createdById: session.user.id }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        weeks: { select: { id: true, days: { select: { exercises: { select: { id: true } } } } } },
        assignments: {
          where: { status: 'ACTIVE' },
          select: { id: true, clientId: true, client: { select: { name: true, email: true } } },
        },
      },
      take: 60,
    }),
    prisma.exercise.count(),
    prisma.programAssignment.count({
      where: { assignedById: session.user.id, status: 'ACTIVE' },
    }),
  ]);

  const totalExercisesPlanned = programs.reduce(
    (s, p) => s + p.weeks.reduce((ws, w) => ws + w.days.reduce((ds, d) => ds + d.exercises.length, 0), 0),
    0,
  );

  const mobilePrograms = programs.map((p) => {
    const totalExercises = p.weeks.reduce(
      (s, w) => s + w.days.reduce((ds, d) => ds + d.exercises.length, 0),
      0,
    );
    const activeClients = new Set(p.assignments.map((a) => a.clientId)).size;
    return {
      id: p.id,
      name: p.name,
      durationWks: p.durationWks,
      weekCount: p.weeks.length,
      totalExercises,
      activeClients,
    };
  });

  return (
    <>
      <ProgramsMobile programs={mobilePrograms} exerciseCount={exerciseCount} />
      <ProgramsDesktop
        programs={programs}
        exerciseCount={exerciseCount}
        totalAssignments={totalAssignments}
        totalExercisesPlanned={totalExercisesPlanned}
      />
    </>
  );
}
