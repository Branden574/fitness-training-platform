import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Users, Archive } from 'lucide-react';
import { requireTrainerSession, initialsFor } from '@/lib/trainer-data';
import { prisma } from '@/lib/prisma';
import { Btn, Chip, DesktopShell } from '@/components/ui/mf';
import ProgramBuilderClient from './program-builder-client';
import DeleteProgramButton from './delete-program-button';

export const dynamic = 'force-dynamic';

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTrainerSession();
  const { id } = await params;

  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true } },
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          days: {
            orderBy: { order: 'asc' },
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: { select: { id: true, name: true } } },
              },
            },
          },
        },
      },
      assignments: {
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      mealPlans: {
        orderBy: [{ order: 'asc' }, { startWeek: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          startWeek: true,
          endWeek: true,
          dailyCalorieTarget: true,
          dailyProteinTarget: true,
          dailyCarbTarget: true,
          dailyFatTarget: true,
          order: true,
        },
      },
    },
  });
  if (!program) notFound();

  if (
    session.user.role !== 'ADMIN' &&
    program.createdById !== session.user.id
  ) {
    notFound();
  }

  // Trainer's clients for the assign picker
  const clients = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      ...(session.user.role === 'ADMIN' ? {} : { trainerId: session.user.id }),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  // Exercise library for the add-exercise picker
  const exerciseOptions = await prisma.exercise.findMany({
    select: { id: true, name: true, muscleGroups: true, difficulty: true },
    orderBy: { name: 'asc' },
    take: 300,
  });

  const activeAssignments = program.assignments.filter((a) => a.status === 'ACTIVE');

  return (
    <DesktopShell
      role="trainer"
      active="builder"
      title={program.name}
      breadcrumbs={`PROGRAMS / ${program.name.toUpperCase()}`}
      headerRight={
        <>
          <Link href="/trainer/builder">
            <Btn variant="ghost" icon={ChevronLeft}>Back</Btn>
          </Link>
          <DeleteProgramButton
            programId={program.id}
            programName={program.name}
            activeAssignments={activeAssignments.length}
          />
        </>
      }
    >
      <div style={{ padding: 24, maxWidth: 1400 }}>
        {/* Header */}
        <div className="mf-card-elev" style={{ padding: 20, marginBottom: 24 }}>
          <div className="flex items-start justify-between" style={{ gap: 24 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mf-eyebrow" style={{ marginBottom: 4 }}>
                {program.durationWks} WEEKS · CREATED{' '}
                {program.createdAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '.')}
              </div>
              <div
                className="mf-font-display"
                style={{
                  fontSize: 28,
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                }}
              >
                {program.name}
              </div>
              {program.description && (
                <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                  {program.description}
                </div>
              )}
              {activeAssignments.length > 0 && (
                <div
                  className="flex items-center gap-1.5 flex-wrap"
                  style={{ marginTop: 12 }}
                >
                  <span
                    className="mf-font-mono mf-fg-mute"
                    style={{ fontSize: 10, marginRight: 4, letterSpacing: '0.1em' }}
                  >
                    ASSIGNED TO:
                  </span>
                  {activeAssignments.map((a) => (
                    <Chip key={a.id} kind="live">
                      {(a.client.name ?? a.client.email).toUpperCase()}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <ProgramBuilderClient
          programId={program.id}
          durationWks={program.durationWks}
          mealPlans={program.mealPlans.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            startWeek: p.startWeek,
            endWeek: p.endWeek,
            dailyCalorieTarget: p.dailyCalorieTarget,
            dailyProteinTarget: p.dailyProteinTarget,
            dailyCarbTarget: p.dailyCarbTarget,
            dailyFatTarget: p.dailyFatTarget,
            order: p.order,
          }))}
          weeks={program.weeks.map((w) => ({
            id: w.id,
            weekNumber: w.weekNumber,
            name: w.name,
            notes: w.notes,
            days: w.days.map((d) => ({
              id: d.id,
              dayOfWeek: d.dayOfWeek,
              sessionType: d.sessionType,
              notes: d.notes,
              order: d.order,
              exercises: d.exercises.map((ex) => ({
                id: ex.id,
                exerciseId: ex.exercise.id,
                exerciseName: ex.exercise.name,
                sets: ex.sets,
                repsScheme: ex.repsScheme,
                targetWeight: ex.targetWeight,
                restSeconds: ex.restSeconds,
                order: ex.order,
              })),
            })),
          }))}
          exerciseOptions={exerciseOptions.map((e) => ({ id: e.id, name: e.name }))}
          clients={clients.map((c) => ({ id: c.id, name: c.name, email: c.email, initials: initialsFor(c.name, c.email) }))}
          assignmentCount={activeAssignments.length}
        />
      </div>
    </DesktopShell>
  );
}
