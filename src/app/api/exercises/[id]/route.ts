import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Exercise table is a shared global library — any TRAINER or ADMIN can edit
// or delete entries. Clients can only read via workout programs.

// Image + video URLs: restrict to https:// absolute URLs or site-relative
// paths. Rejects `javascript:`, `data:`, `file:`, and `http:` (non-secure),
// which would otherwise let a malicious trainer poison shared exercise
// rows with tracking pixels, internal SSRF targets, or (theoretical)
// CSS-background injection payloads. free-exercise-db images are HTTPS,
// R2 uploads are HTTPS, so legitimate uses all pass.
const safeRefUrl = z
  .string()
  .max(500)
  .refine(
    (v) => v.length === 0 || v.startsWith('https://') || v.startsWith('/'),
    { message: 'URL must be https:// or a site-relative /path' },
  );

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  instructions: z.array(z.string().max(300)).max(30).optional(),
  muscleGroups: z.array(z.string().max(60)).max(20).optional(),
  equipment: z.array(z.string().max(60)).max(20).optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  imageUrl: safeRefUrl.nullable().optional(),
  videoUrl: safeRefUrl.nullable().optional(),
});

async function requireTrainerOrAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user?.id ||
    (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN')
  ) {
    return null;
  }
  return session;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireTrainerOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid fields', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const existing = await prisma.exercise.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const updated = await prisma.exercise.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        difficulty: true,
        imageUrl: true,
      },
    });
    return NextResponse.json(updated, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (err) {
    console.error('Exercise update failed:', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireTrainerOrAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Refuse to delete if the exercise is referenced by any workout, program,
  // or historical progress log — deleting would cascade-null or orphan real
  // client training history. Admin can force by passing ?force=1.
  const refs = await prisma.$transaction([
    prisma.workoutExercise.count({ where: { exerciseId: id } }),
    prisma.workoutProgress.count({ where: { exerciseId: id } }),
    prisma.programDayExercise.count({ where: { exerciseId: id } }),
  ]);
  const [workoutRefs, progressRefs, programRefs] = refs;
  const totalRefs = workoutRefs + progressRefs + programRefs;

  if (totalRefs > 0 && session.user.role !== 'ADMIN') {
    return NextResponse.json(
      {
        error: `Exercise is used in ${workoutRefs} workouts, ${programRefs} program days, and ${progressRefs} logged sets. Ask admin to force-delete, or remove it from programs first.`,
      },
      { status: 409 },
    );
  }

  try {
    await prisma.exercise.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Exercise delete failed:', err);
    return NextResponse.json(
      { error: 'Delete failed — check if it’s still referenced somewhere.' },
      { status: 500 },
    );
  }
}
