import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SAMPLE_EXERCISES = [
  { name: 'Barbell Bench Press', sets: 4, reps: 5, weight: 135, rest: 180 },
  { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 50, rest: 120 },
  { name: 'Overhead Press', sets: 3, reps: 8, weight: 85, rest: 120 },
  { name: 'Lateral Raises', sets: 3, reps: 12, weight: 15, rest: 60 },
  { name: 'Tricep Pushdown', sets: 3, reps: 12, weight: 60, rest: 60 },
];

async function ensureTemplate(trainerId: string) {
  const exerciseRecords = await Promise.all(
    SAMPLE_EXERCISES.map((e) =>
      prisma.exercise.upsert({
        where: { id: `sample-${e.name.toLowerCase().replace(/\s+/g, '-')}` },
        update: {},
        create: {
          id: `sample-${e.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: e.name,
          difficulty: 'INTERMEDIATE',
        },
      }),
    ),
  );

  const workout = await prisma.workout.create({
    data: {
      title: 'Upper Body · Push',
      description: 'Auto-generated starter workout. Your trainer can replace this anytime.',
      duration: 60,
      difficulty: 'INTERMEDIATE',
      type: 'STRENGTH',
      createdBy: trainerId,
      exercises: {
        create: SAMPLE_EXERCISES.map((e, i) => ({
          exerciseId: exerciseRecords[i].id,
          order: i + 1,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          restTime: e.rest,
        })),
      },
    },
  });

  return workout;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trainerId: true },
  });

  let workout =
    (user?.trainerId
      ? await prisma.workout.findFirst({
          where: { createdBy: user.trainerId },
          orderBy: { createdAt: 'desc' },
        })
      : null) ??
    (await prisma.workout.findFirst({ orderBy: { createdAt: 'desc' } }));

  if (!workout) {
    const creatorId =
      user?.trainerId ??
      (await prisma.user.findFirst({
        where: { role: 'TRAINER' },
        select: { id: true },
      }))?.id ??
      userId;
    workout = await ensureTemplate(creatorId);
  }

  const newSession = await prisma.workoutSession.create({
    data: {
      userId,
      workoutId: workout.id,
      startTime: new Date(),
      completed: false,
    },
    select: { id: true },
  });

  return NextResponse.json({ sessionId: newSession.id });
}
