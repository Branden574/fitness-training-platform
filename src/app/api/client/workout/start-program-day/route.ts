import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/client/workout/start-program-day
// Body: { programDayId: string }
//
// Converts a program day (from an active ProgramAssignment) into a concrete
// Workout + WorkoutSession so the client can start logging. The existing
// `/api/client/workout/start` endpoint only accepts standalone Workout
// templates, which is why program days didn't show up on /client/workout
// before — there was no bridge.
//
// Strategy: create a fresh Workout owned by the program's creator with
// exercises mirrored from ProgramDayExercise, then hand off to the normal
// session flow. A new Workout per start keeps things simple — the trainer
// can edit the program day later and the next start picks up the changes,
// while historical sessions keep their immutable snapshot.

function parseRepsScheme(scheme: string): number | null {
  // Handles "8", "8-12", "8x12", "amrap", "max". Returns the upper bound
  // of a range (conservative — client gets room to hit the harder target)
  // or null when the scheme doesn't cleanly map to a single int.
  const trimmed = scheme.trim().toLowerCase();
  if (!trimmed) return null;
  const rangeMatch = trimmed.match(/^(\d+)\s*[-x–]\s*(\d+)$/);
  if (rangeMatch) {
    const hi = Number(rangeMatch[2]);
    return Number.isFinite(hi) ? hi : null;
  }
  const soloMatch = trimmed.match(/^(\d+)$/);
  if (soloMatch) {
    const n = Number(soloMatch[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseTargetWeight(raw: string | null | undefined): number | null {
  if (!raw) return null;
  // "185", "185 lb", "bodyweight", "rpe 8"
  const m = raw.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let programDayId: string;
  try {
    const body = (await request.json()) as { programDayId?: unknown };
    if (!body.programDayId || typeof body.programDayId !== 'string') {
      return NextResponse.json({ error: 'programDayId is required' }, { status: 400 });
    }
    programDayId = body.programDayId;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const programDay = await prisma.programDay.findUnique({
    where: { id: programDayId },
    include: {
      programWeek: {
        select: {
          programId: true,
          weekNumber: true,
          program: { select: { name: true, createdById: true } },
        },
      },
      exercises: {
        orderBy: { order: 'asc' },
        select: {
          exerciseId: true,
          order: true,
          sets: true,
          repsScheme: true,
          targetWeight: true,
          restSeconds: true,
          notes: true,
        },
      },
    },
  });
  if (!programDay) {
    return NextResponse.json({ error: 'Program day not found' }, { status: 404 });
  }
  if (programDay.exercises.length === 0) {
    return NextResponse.json(
      { error: 'That day has no exercises. Check with your coach.' },
      { status: 400 },
    );
  }

  // Client must have an active assignment for the parent program.
  const assignment = await prisma.programAssignment.findFirst({
    where: {
      clientId: userId,
      programId: programDay.programWeek.programId,
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: 'This program isn\'t assigned to you.' },
      { status: 403 },
    );
  }

  const programName = programDay.programWeek.program.name;
  const title = `${programName} · W${programDay.programWeek.weekNumber} · ${programDay.sessionType}`;

  // Pack the whole start flow into one transaction so a half-created
  // Workout (no exercises / no session) can't leak.
  const sessionRow = await prisma.$transaction(async (tx) => {
    const workout = await tx.workout.create({
      data: {
        title,
        description: programDay.notes,
        duration: 60,
        createdBy: programDay.programWeek.program.createdById,
      },
      select: { id: true },
    });

    await tx.workoutExercise.createMany({
      data: programDay.exercises.map((e) => ({
        workoutId: workout.id,
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: parseRepsScheme(e.repsScheme),
        weight: parseTargetWeight(e.targetWeight),
        restTime: e.restSeconds,
        notes: e.notes,
        order: e.order,
      })),
    });

    const ws = await tx.workoutSession.create({
      data: {
        userId,
        workoutId: workout.id,
        startTime: new Date(),
        completed: false,
      },
      select: { id: true },
    });
    return ws;
  });

  return NextResponse.json({ sessionId: sessionRow.id });
}
