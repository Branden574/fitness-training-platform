import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Play, Calendar } from 'lucide-react';
import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import { Btn, ClientDesktopShell } from '@/components/ui/mf';
import StartSampleButton from './start-sample-button';
import WorkoutPickerClient, { type WorkoutPickerItem } from './workout-picker-client';

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

  const ctx = await getClientContext(userId);

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

  // If no templates exist at all, show the old empty state that bootstraps a sample.
  if (items.length === 0) {
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

  // Templates exist — show the picker.
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
          Pick a template to start a session. Your progress and PRs will be logged automatically.
        </p>
        <WorkoutPickerClient items={items} />
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
            <WorkoutPickerClient items={items} />
          </div>
        </ClientDesktopShell>
      </div>
    </>
  );
}
