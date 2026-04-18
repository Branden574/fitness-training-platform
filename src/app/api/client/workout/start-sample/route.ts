import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  const workout =
    (user?.trainerId
      ? await prisma.workout.findFirst({
          where: { createdBy: user.trainerId },
          orderBy: { createdAt: 'desc' },
        })
      : null) ??
    (await prisma.workout.findFirst({ orderBy: { createdAt: 'desc' } }));

  if (!workout) {
    return NextResponse.json(
      { error: 'No workout templates in the library yet. Ask your trainer to build one.' },
      { status: 404 },
    );
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
