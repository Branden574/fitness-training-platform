import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/client/workout/start
 * Body: { workoutId: string }
 *
 * Starts a WorkoutSession for the signed-in client for the given workout.
 * Because WorkoutSession has a unique constraint on (workoutId, userId),
 * if a prior session exists we reset it to a fresh in-progress state
 * (keeping historical WorkoutProgress rows so PR history is preserved).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  let workoutId: string;
  try {
    const body = (await request.json()) as { workoutId?: unknown };
    if (!body.workoutId || typeof body.workoutId !== 'string') {
      return NextResponse.json({ error: 'workoutId is required' }, { status: 400 });
    }
    workoutId = body.workoutId;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { id: true },
  });
  if (!workout) {
    return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
  }

  const existing = await prisma.workoutSession.findFirst({
    where: { userId, workoutId },
    select: { id: true },
  });

  let sessionId: string;
  if (existing) {
    const reset = await prisma.workoutSession.update({
      where: { id: existing.id },
      data: {
        startTime: new Date(),
        endTime: null,
        completed: false,
      },
      select: { id: true },
    });
    sessionId = reset.id;
  } else {
    const created = await prisma.workoutSession.create({
      data: {
        userId,
        workoutId,
        startTime: new Date(),
        completed: false,
      },
      select: { id: true },
    });
    sessionId = created.id;
  }

  return NextResponse.json({ sessionId });
}
