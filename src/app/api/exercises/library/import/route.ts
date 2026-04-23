import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireTrainerSession } from '@/lib/trainer-data';

interface ImportBody {
  externalId?: string;
  name?: string;
  gifUrl?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  secondaryMuscles?: string[];
  instructions?: string[];
}

interface FreeExerciseItem {
  name?: string;
  images?: string[];
}

// ExerciseDB sometimes returns empty gifUrl for certain results. Fall back to
// yuhonas/free-exercise-db so an imported exercise always comes with an image
// — Branden hit the "NO GIF" placeholder on every import before this. Same
// dataset the Fill-Images backfill uses.
const FREE_DB_URL =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json';
const FREE_DB_IMAGE_BASE =
  'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/';

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreMatch(a: string, b: string): number {
  const aT = new Set(tokenize(a));
  const bT = new Set(tokenize(b));
  if (aT.size === 0 || bT.size === 0) return 0;
  let shared = 0;
  for (const t of aT) if (bT.has(t)) shared++;
  return shared / Math.min(aT.size, bT.size);
}

async function lookupFreeImage(name: string): Promise<string | null> {
  try {
    const res = await fetch(FREE_DB_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const library = (await res.json()) as FreeExerciseItem[];
    if (!Array.isArray(library)) return null;
    let best: { item: FreeExerciseItem; score: number } | null = null;
    for (const item of library) {
      const candidate = item.name ?? '';
      if (!candidate) continue;
      const score = scoreMatch(name, candidate);
      if (score <= 0) continue;
      if (!best || score > best.score) best = { item, score };
    }
    if (!best || best.score < 0.5) return null;
    const first = best.item.images?.[0];
    return first ? FREE_DB_IMAGE_BASE + first : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof requireTrainerSession>>;
  try {
    session = await requireTrainerSession();
  } catch {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let body: ImportBody;
  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, gifUrl, target, equipment, secondaryMuscles, instructions, bodyPart } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ message: 'Exercise name is required' }, { status: 400 });
  }

  const muscleGroups: string[] = [];
  if (target) muscleGroups.push(target);
  if (bodyPart && bodyPart !== target) muscleGroups.push(bodyPart);
  if (Array.isArray(secondaryMuscles)) {
    for (const m of secondaryMuscles) {
      if (m && !muscleGroups.includes(m)) muscleGroups.push(m);
    }
  }

  const equipmentList = equipment ? [equipment] : [];
  const instructionList = Array.isArray(instructions) ? instructions.filter(Boolean) : [];

  // Resolve the best available image: ExerciseDB's gifUrl wins if present,
  // otherwise fall back to free-exercise-db by name. Keeps the import flow
  // a single action — trainer doesn't need to click Fill Images after.
  let resolvedImage: string | null = gifUrl && gifUrl.trim() ? gifUrl.trim() : null;
  if (!resolvedImage) {
    resolvedImage = await lookupFreeImage(name);
  }

  const trainerUserId = session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  // Only dedupe against exercises THIS trainer can see (their own customs
  // + the shared library). Another trainer's private exercise with the same
  // name should NOT block this trainer from importing their own copy.
  const existing = await prisma.exercise.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      OR: [
        { createdByUserId: null },
        { createdByUserId: trainerUserId },
      ],
    },
  });

  try {
    if (existing) {
      // If the match is a shared stock entry and the caller isn't an admin,
      // create a private copy for this trainer instead of mutating the
      // shared row. Otherwise update in place (their own custom, or admin
      // editing shared).
      const isMutableByCaller =
        isAdmin || existing.createdByUserId === trainerUserId;

      if (isMutableByCaller) {
        const data: Prisma.ExerciseUpdateInput = {
          imageUrl: resolvedImage || existing.imageUrl,
        };
        if (muscleGroups.length > 0) data.muscleGroups = muscleGroups;
        if (equipmentList.length > 0) data.equipment = equipmentList;
        if (instructionList.length > 0) data.instructions = instructionList;

        const updated = await prisma.exercise.update({
          where: { id: existing.id },
          data,
        });
        return NextResponse.json({ exercise: updated, created: false });
      }
      // Fall through to create a trainer-owned duplicate below.
    }

    const created = await prisma.exercise.create({
      data: {
        name,
        imageUrl: resolvedImage,
        muscleGroups,
        equipment: equipmentList,
        instructions: instructionList,
        difficulty: 'INTERMEDIATE',
        createdByUserId: trainerUserId,
      },
    });
    return NextResponse.json({ exercise: created, created: true });
  } catch (error) {
    console.error('Import exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to import exercise' },
      { status: 500 },
    );
  }
}
