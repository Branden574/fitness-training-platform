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

export async function POST(request: Request) {
  try {
    await requireTrainerSession();
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

  const existing = await prisma.exercise.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });

  try {
    if (existing) {
      const data: Prisma.ExerciseUpdateInput = {
        imageUrl: gifUrl || existing.imageUrl,
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

    const created = await prisma.exercise.create({
      data: {
        name,
        imageUrl: gifUrl || null,
        muscleGroups,
        equipment: equipmentList,
        instructions: instructionList,
        difficulty: 'INTERMEDIATE',
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
