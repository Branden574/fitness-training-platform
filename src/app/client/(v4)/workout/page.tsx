import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Play, Calendar } from 'lucide-react';
import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Btn, ClientDesktopShell } from '@/components/ui/mf';
import StartSampleButton from './start-sample-button';
import WorkoutPickerClient, { type WorkoutPickerItem } from './workout-picker-client';
import StartProgramDayButton from './start-program-day-button';

const DAY_OF_WEEK_FROM_JS: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

async function findTodayProgramDay(userId: string) {
  const assignment = await prisma.programAssignment.findFirst({
    where: { clientId: userId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    select: {
      startDate: true,
      program: {
        select: {
          id: true,
          name: true,
          durationWks: true,
        },
      },
    },
  });
  if (!assignment) return null;

  const daysElapsed = Math.floor(
    (Date.now() - new Date(assignment.startDate).getTime()) / 86_400_000,
  );
  const weekIdx = Math.floor(daysElapsed / 7);
  if (weekIdx < 0 || weekIdx >= assignment.program.durationWks) return null;

  const todayDow = DAY_OF_WEEK_FROM_JS[new Date().getDay()]!;

  const day = await prisma.programDay.findFirst({
    where: {
      dayOfWeek: todayDow,
      programWeek: {
        programId: assignment.program.id,
        weekNumber: weekIdx + 1,
      },
    },
    include: {
      exercises: {
        orderBy: { order: 'asc' },
        include: {
          exercise: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!day || day.exercises.length === 0) return null;

  return {
    id: day.id,
    sessionType: day.sessionType,
    notes: day.notes,
    programName: assignment.program.name,
    weekNumber: weekIdx + 1,
    exercises: day.exercises.map((e) => ({
      name: e.exercise.name,
      sets: e.sets,
      repsScheme: e.repsScheme,
      targetWeight: e.targetWeight,
    })),
  };
}

type TodayDay = NonNullable<Awaited<ReturnType<typeof findTodayProgramDay>>>;

function TodayProgramCard({ day }: { day: TodayDay }) {
  return (
    <div
      className="mf-card-elev"
      style={{
        marginBottom: 20,
        padding: 20,
        borderColor: 'var(--mf-accent)',
        background: 'linear-gradient(180deg, rgba(255,77,28,0.06), transparent 60%)',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <div>
          <div className="mf-eyebrow" style={{ color: 'var(--mf-accent)' }}>
            TODAY · {day.programName.toUpperCase()} · W{day.weekNumber}
          </div>
          <div
            className="mf-font-display"
            style={{
              fontSize: 22,
              letterSpacing: '-0.01em',
              marginTop: 4,
              textTransform: 'uppercase',
            }}
          >
            {day.sessionType}
          </div>
        </div>
        <StartProgramDayButton programDayId={day.id} />
      </div>
      {day.notes && (
        <div
          className="mf-fg-dim"
          style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}
        >
          {day.notes}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--mf-hairline)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        {day.exercises.map((ex, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderBottom:
                i < day.exercises.length - 1
                  ? '1px solid var(--mf-hairline)'
                  : 'none',
              fontSize: 13,
            }}
          >
            <span
              className="mf-font-mono mf-fg-mute mf-tnum"
              style={{ fontSize: 10, width: 20 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, fontWeight: 500 }}>{ex.name}</span>
            <span
              className="mf-font-mono mf-fg-dim"
              style={{ fontSize: 11, letterSpacing: '0.05em' }}
            >
              {ex.sets}×{ex.repsScheme}
              {ex.targetWeight ? ` @ ${ex.targetWeight}` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default async function WorkoutLandingPage() {
  const session = await requireClientSession();
  const userId = session.user.id;

  const inProgress = await prisma.workoutSession.findFirst({
    where: { userId, completed: false },
    orderBy: { startTime: 'desc' },
    select: { id: true },
  });
  if (inProgress) redirect(`/client/workout/${inProgress.id}`);

  const [ctx, todayProgramDay] = await Promise.all([
    getClientContext(userId),
    findTodayProgramDay(userId),
  ]);

  // Prefer templates from the client's trainer; fall back to all templates.
  const trainerId = ctx.trainer?.id ?? null;
  const byTrainer = trainerId
    ? await prisma.workout.findMany({
        where: { createdBy: trainerId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          type: true,
          duration: true,
          _count: { select: { exercises: true } },
        },
      })
    : [];

  const raw =
    byTrainer.length > 0
      ? byTrainer
      : await prisma.workout.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
            type: true,
            duration: true,
            _count: { select: { exercises: true } },
          },
        });

  const items: WorkoutPickerItem[] = raw.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    difficulty: String(w.difficulty),
    type: String(w.type),
    duration: w.duration,
    exerciseCount: w._count.exercises,
  }));

  // If no library templates exist but the client has a programmed day today,
  // skip the "No sessions yet" empty state and show the program day instead.
  if (items.length === 0 && !todayProgramDay) {
    return (
      <>
        <main
          className="flex flex-col md:hidden"
          style={{ padding: '24px 16px', minHeight: '100%' }}
        >
          <div className="mf-eyebrow" style={{ marginBottom: 8 }}>WORKOUT</div>
          <h1
            className="mf-font-display"
            style={{ fontSize: 28, letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 16 }}
          >
            No sessions yet
          </h1>
          <p className="mf-fg-dim" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 24 }}>
            Your trainer hasn&apos;t assigned any workouts yet. Start a session from a library template, or browse your program.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <StartSampleButton fullWidth />
            <Link href="/client/program">
              <Btn icon={Calendar} className="w-full">Browse program</Btn>
            </Link>
          </div>
        </main>

        <div className="hidden md:block">
          <ClientDesktopShell
            active="workout"
            breadcrumbs="TRAIN"
            title="Choose a workout"
            athleteInitials={ctx.initials}
            athleteName={ctx.name ?? ctx.email}
            athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
          >
            <div className="p-6">
              <div
                className="mf-card-elev"
                style={{
                  padding: 40,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  className="grid place-items-center"
                  style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--mf-surface-3)' }}
                >
                  <Play size={22} className="mf-fg-mute" />
                </div>
                <div>
                  <div
                    className="mf-font-display"
                    style={{ fontSize: 24, letterSpacing: '-0.01em', lineHeight: 1.1 }}
                  >
                    No sessions yet
                  </div>
                  <div className="mf-fg-dim" style={{ fontSize: 13, marginTop: 8, maxWidth: 420 }}>
                    Your trainer hasn&apos;t assigned any workouts yet. Start a session from a library template, or browse your program.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <StartSampleButton />
                  <Link href="/client/program">
                    <Btn icon={Calendar}>Browse program</Btn>
                  </Link>
                </div>
              </div>
            </div>
          </ClientDesktopShell>
        </div>
      </>
    );
  }

  // Templates exist — show the picker, with today's programmed day pinned
  // at the top if the client has one.
  return (
    <>
      <main
        className="flex flex-col md:hidden"
        style={{ padding: '20px 16px 24px', minHeight: '100%' }}
      >
        <div className="mf-eyebrow" style={{ marginBottom: 8 }}>WORKOUT · TRAIN</div>
        <h1
          className="mf-font-display"
          style={{
            fontSize: 26,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            marginBottom: 6,
          }}
        >
          Choose a workout
        </h1>
        <p className="mf-fg-dim" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
          {todayProgramDay
            ? 'Your programmed session is ready below. You can also pick a template to freestyle.'
            : 'Pick a template to start a session. Your progress and PRs will be logged automatically.'}
        </p>
        {todayProgramDay && <TodayProgramCard day={todayProgramDay} />}
        {items.length > 0 && <WorkoutPickerClient items={items} />}
      </main>

      <div className="hidden md:block">
        <ClientDesktopShell
          active="workout"
          breadcrumbs="TRAIN"
          title="Choose a workout"
          athleteInitials={ctx.initials}
          athleteName={ctx.name ?? ctx.email}
          athleteMeta={ctx.trainer?.name ? `COACH · ${ctx.trainer.name.toUpperCase()}` : undefined}
        >
          <div className="p-6">
            {todayProgramDay && <TodayProgramCard day={todayProgramDay} />}
            {items.length > 0 && <WorkoutPickerClient items={items} />}
          </div>
        </ClientDesktopShell>
      </div>
    </>
  );
}
