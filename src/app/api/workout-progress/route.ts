import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPRAchievedEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { workoutSessionId, exercises, date } = body;

    // Validate the workout session belongs to the user
    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id: workoutSessionId,
        userId: session.user.id
      }
    });

    if (!workoutSession) {
      return NextResponse.json({ error: 'Workout session not found' }, { status: 404 });
    }

    // Use provided date or fall back to workout session date
    let workoutDate: Date;
    if (date) {
      // Parse date string in local timezone to avoid UTC shift
      if (typeof date === 'string' && date.includes('-') && date.length === 10) {
        // Handle YYYY-MM-DD format
        const [year, month, day] = date.split('-').map(Number);
        workoutDate = new Date(year, month - 1, day);
      } else {
        // Handle ISO string or Date object
        workoutDate = new Date(date);
      }
    } else {
      workoutDate = workoutSession.startTime || new Date();
    }

    type IncomingExercise = {
      exerciseId: string;
      exerciseName?: string;
      weight?: number;
      reps?: number;
      sets?: number;
      duration?: number;
      notes?: string;
    };
    const incoming = exercises as IncomingExercise[];
    const exerciseIds = incoming.map((e) => e.exerciseId);

    // Batch lookup: prior max weight per exercise (1 query instead of N).
    const priorMaxRows = await prisma.workoutProgress.groupBy({
      by: ['exerciseId'],
      where: {
        userId: session.user.id,
        exerciseId: { in: exerciseIds },
        weight: { not: null },
      },
      _max: { weight: true },
    });
    const priorMaxMap = new Map<string, number | null>(
      priorMaxRows.map((r) => [r.exerciseId, r._max.weight ?? null]),
    );

    // Batch lookup: exercise names (1 query instead of N includes).
    const exerciseRecords = await prisma.exercise.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, name: true },
    });
    const exerciseNameMap = new Map(exerciseRecords.map((e) => [e.id, e.name]));

    // Transactional create: all rows commit together, or none do.
    const progressEntries = await prisma.$transaction(
      incoming.map((exercise) =>
        prisma.workoutProgress.create({
          data: {
            userId: session.user.id,
            exerciseId: exercise.exerciseId,
            workoutSessionId: workoutSessionId,
            weight: exercise.weight || null,
            sets: exercise.sets || null,
            reps: exercise.reps || null,
            notes: exercise.notes || null,
            date: workoutDate,
          },
          include: { exercise: { select: { name: true } } },
        }),
      ),
    );

    // Detect PRs against the pre-transaction priorMax (don't include the just-written rows).
    const prEvents: Array<{
      exerciseId: string;
      exerciseName: string;
      newWeight: number;
      previousWeight: number | null;
      reps: number | null;
    }> = [];
    for (const exercise of incoming) {
      if (!exercise.weight || exercise.weight <= 0) continue;
      const priorMax = priorMaxMap.get(exercise.exerciseId) ?? null;
      if (priorMax != null && exercise.weight <= priorMax) continue;
      prEvents.push({
        exerciseId: exercise.exerciseId,
        exerciseName:
          exerciseNameMap.get(exercise.exerciseId) ??
          exercise.exerciseName ??
          'Exercise',
        newWeight: exercise.weight,
        previousWeight: priorMax,
        reps: exercise.reps ?? null,
      });
    }

    // Fire-and-forget PR emails to the assigned trainer (if any)
    if (prEvents.length > 0) {
      void (async () => {
        try {
          const athlete = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              name: true,
              assignedTrainer: { select: { email: true, name: true } },
            },
          });
          const trainer = athlete?.assignedTrainer;
          if (!trainer?.email) return;
          for (const pr of prEvents) {
            await sendPRAchievedEmail({
              trainerEmail: trainer.email,
              trainerName: trainer.name,
              athleteName: athlete?.name ?? null,
              exerciseName: pr.exerciseName,
              newWeight: pr.newWeight,
              previousWeight: pr.previousWeight,
              reps: pr.reps,
              clientId: session.user.id,
            });
          }
        } catch (e) {
          console.warn('[email:pr] dispatch failed:', e);
        }
      })();
    }

    return NextResponse.json({
      message: 'Workout progress saved successfully',
      progress: progressEntries,
      prs: prEvents.map((p) => ({
        exerciseId: p.exerciseId,
        exerciseName: p.exerciseName,
        newWeight: p.newWeight,
        previousWeight: p.previousWeight,
      })),
    });

  } catch (error) {
    console.error('Error saving workout progress:', error);
    return NextResponse.json(
      { error: 'Failed to save workout progress' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const exerciseId = searchParams.get('exerciseId');

    // If requesting another user's progress, check if current user is a trainer
    if (userId !== session.user.id) {
      const trainer = await prisma.user.findFirst({
        where: {
          id: session.user.id,
          role: 'TRAINER'
        }
      });

      if (!trainer) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      }

      // Verify the user is assigned to this trainer
      const clientRelation = await prisma.user.findFirst({
        where: {
          id: userId,
          trainerId: session.user.id
        }
      });

      if (!clientRelation) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    const whereClause: Record<string, unknown> = { userId };
    if (exerciseId) {
      whereClause.exerciseId = exerciseId;
    }

    const progress = await prisma.workoutProgress.findMany({
      where: whereClause,
      include: {
        exercise: true,
        workoutSession: {
          include: {
            workout: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return NextResponse.json(progress);

  } catch (error) {
    console.error('Error fetching workout progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout progress' },
      { status: 500 }
    );
  }
}