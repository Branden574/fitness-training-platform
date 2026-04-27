import { notFound } from 'next/navigation';
import { requireClientSession, getClientContext } from '@/lib/client-data';
import { prisma } from '@/lib/prisma';
import ActiveWorkoutClient from './active-workout-client';
import ActiveWorkoutDesktop from './active-workout-desktop';

export const dynamic = 'force-dynamic';

export default async function ActiveWorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await requireClientSession();
  const { sessionId } = await params;
  const ctx = await getClientContext(session.user.id);

  const ws = await prisma.workoutSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    include: {
      workout: {
        include: {
          exercises: {
            orderBy: { order: 'asc' },
            include: {
              exercise: {
                select: {
                  id: true,
                  name: true,
                  muscleGroups: true,
                  videoUrl: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
      workoutProgress: {
        select: {
          exerciseId: true,
          weight: true,
          reps: true,
          sets: true,
          notes: true,
        },
      },
    },
  });

  if (!ws) notFound();

  const payload = {
    id: ws.id,
    completed: ws.completed,
    startedAt: ws.startTime.toISOString(),
    workout: {
      id: ws.workout.id,
      title: ws.workout.title,
      type: ws.workout.type,
      difficulty: ws.workout.difficulty,
      duration: ws.workout.duration,
      exercises: ws.workout.exercises.map((we) => {
        const prev = ws.workoutProgress.find((p) => p.exerciseId === we.exercise.id);
        return {
          id: we.id,
          exerciseId: we.exercise.id,
          name: we.exercise.name,
          targetSets: we.sets,
          targetReps: we.reps ?? 0,
          targetWeight: we.weight ?? null,
          restSeconds: we.restTime ?? 120,
          order: we.order,
          muscleGroup: Array.isArray(we.exercise.muscleGroups)
            ? String(we.exercise.muscleGroups[0] ?? '')
            : '',
          imageUrl: we.exercise.imageUrl ?? null,
          previous: prev
            ? {
                weight: prev.weight ?? null,
                reps: prev.reps ?? null,
                sets: prev.sets ?? null,
              }
            : null,
        };
      }),
    },
  };

  return (
    <>
      <ActiveWorkoutClient initial={payload} trainerId={ctx.trainer?.id ?? null} />
      <ActiveWorkoutDesktop
        initial={payload}
        athleteInitials={ctx.initials}
        athleteName={ctx.name ?? ctx.email}
        athletePhotoUrl={ctx.image}
      />
    </>
  );
}
