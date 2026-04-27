import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { buildWorkoutCompletedNotification } from '@/lib/notifications/workoutCompleted';
import { summarizeWorkout } from '@/lib/ai/workoutSummary';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { workoutId, date } = body;

    // Parse date properly to avoid timezone issues
    let targetDate: Date;
    if (date) {
      targetDate = new Date(date);
    } else {
      targetDate = new Date();
    }

    // Check if a session already exists for this date (using local date comparison)
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();
    
    const startOfDay = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
    const endOfDay = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999);

    let workoutSession = await prisma.workoutSession.findFirst({
      where: {
        userId: session.user.id,
        workoutId: workoutId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    // If no session exists for this date, create one
    if (!workoutSession) {
      workoutSession = await prisma.workoutSession.create({
        data: {
          userId: session.user.id,
          workoutId: workoutId,
          startTime: startOfDay, // Use local date without timezone conversion
          createdAt: startOfDay
        }
      });
    }

    return NextResponse.json(workoutSession);

  } catch (error) {
    console.error('Error creating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to create workout session' },
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
    const date = searchParams.get('date');

    // If requesting another user's sessions, check if current user is a trainer
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

    interface WhereClause {
      userId: string;
      createdAt?: {
        gte: Date;
        lte: Date;
      };
    }

    const whereClause: WhereClause = { userId };

    // If date is specified, filter by date (using local timezone)
    if (date) {
      const targetDate = new Date(date);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();
      
      const startOfDay = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
      const endOfDay = new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999);

      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const sessions = await prisma.workoutSession.findMany({
      where: whereClause,
      include: {
        workout: {
          include: {
            exercises: true
          }
        },
        workoutProgress: {
          include: {
            exercise: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100,
    });

    return NextResponse.json(sessions);

  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout sessions' },
      { status: 500 }
    );
  }
}

// Update a workout session (typically mark completed / set endTime after finish)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      completed,
      endTime,
      notes,
      rating,
      caloriesBurned,
      completedSetCount,
      totalSetCount,
      durationMs,
    } = body as {
      id?: string;
      completed?: boolean;
      endTime?: string | Date;
      notes?: string | null;
      rating?: number | null;
      caloriesBurned?: number | null;
      completedSetCount?: number;
      totalSetCount?: number;
      durationMs?: number;
    };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        completed: true,
        endTime: true,
        startTime: true,
        user: { select: { id: true, name: true, trainerId: true } },
        workout: { select: { title: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updated = await prisma.workoutSession.update({
      where: { id },
      data: {
        ...(completed !== undefined ? { completed } : {}),
        ...(endTime !== undefined ? { endTime: endTime ? new Date(endTime) : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(caloriesBurned !== undefined ? { caloriesBurned } : {}),
      },
    });

    // Auto-notify the trainer the first time a session transitions to completed.
    // Idempotent: existing.completed===false AND existing.endTime===null guarantees
    // we only fire on the first transition. Network retries or a double-tap of
    // FINISH won't re-fire, and a client toggling completed back-and-forth won't
    // either because endTime stays set after the first finish.
    const trainerId = existing.user?.trainerId ?? null;
    const justCompleted =
      existing.completed === false &&
      completed === true &&
      existing.endTime === null;

    if (justCompleted && trainerId) {
      const startMs = existing.startTime?.getTime() ?? Date.now();
      const endMs = endTime ? new Date(endTime).getTime() : Date.now();
      const effectiveDurationMs =
        typeof durationMs === 'number' && durationMs >= 0
          ? durationMs
          : Math.max(0, endMs - startMs);
      const payload = buildWorkoutCompletedNotification({
        clientName: existing.user?.name ?? null,
        workoutTitle: existing.workout?.title ?? null,
        completedSetCount: completedSetCount ?? 0,
        totalSetCount: totalSetCount ?? 0,
        durationMs: effectiveDurationMs,
        clientId: existing.user?.id ?? '',
      });

      // Phase 3A: AI summary fires before notification dispatch so the body can
      // include it. Hard 4s timeout inside summarizeWorkout means worst-case
      // total latency is bounded. Returns null on disabled / skip / error —
      // fall through to factual notification (today's behavior).
      const aiSummary = await summarizeWorkout({
        sessionId: id,
        workoutId: updated.workoutId ?? null,
        clientId: existing.user?.id ?? '',
        clientName: existing.user?.name ?? null,
        workoutTitle: existing.workout?.title ?? null,
        completedSetCount: completedSetCount ?? 0,
        totalSetCount: totalSetCount ?? 0,
        durationMs: effectiveDurationMs,
        trainerId,
      });

      if (aiSummary) {
        // Persist for future surfaces (digest, workout detail view).
        await prisma.workoutSession.update({
          where: { id },
          data: { aiSummary },
        }).catch((err) => {
          console.error('[workout-sessions] failed to persist aiSummary', err);
        });
      }

      // Enrich notification body with AI line, capped to keep under FCM 256B.
      const factualBody = payload.body;
      const enrichedBody = aiSummary ? `${factualBody} · ${aiSummary}` : factualBody;
      const boundedBody = enrichedBody.length > 200
        ? `${enrichedBody.slice(0, 200)}…`
        : enrichedBody;

      // Fire-and-forget: dispatchNotification is already fail-open. A broken
      // push subscription must not block the workout-session response.
      void dispatchNotification({
        userId: trainerId,
        type: 'WORKOUT_COMPLETED',
        title: payload.title,
        body: boundedBody,
        actionUrl: payload.actionUrl,
        metadata: { sessionId: id, workoutId: updated.workoutId, aiSummary: aiSummary ?? null },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to update workout session' },
      { status: 500 }
    );
  }
}