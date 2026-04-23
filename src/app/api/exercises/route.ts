import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  canMutateExercise,
  visibleExercisesFilter,
} from '@/lib/exerciseScope';

// Get exercises visible to the caller: stock library (null createdByUserId)
// plus the caller's own custom exercises. Admins see everything.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const exercises = await prisma.exercise.findMany({
      where: visibleExercisesFilter({
        id: session.user.id,
        role: session.user.role as 'CLIENT' | 'TRAINER' | 'ADMIN',
      }),
      orderBy: [{ difficulty: 'asc' }, { name: 'asc' }],
      take: 200,
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error('Get exercises error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Create a new exercise. TRAINER-created exercises are private to that
// trainer; ADMIN-created exercises are private to the admin unless they
// explicitly pass `shared: true` (admin-only), in which case the exercise
// lands in the shared stock library.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, targetMuscle, difficulty, instructions, equipment, category, shared } = body;

    if (!name || !targetMuscle) {
      return NextResponse.json(
        { message: 'Exercise name and target muscle are required' },
        { status: 400 },
      );
    }

    const isAdminSharing = session.user.role === 'ADMIN' && shared === true;
    const createdByUserId = isAdminSharing ? null : session.user.id;

    const exercise = await prisma.exercise.create({
      data: {
        name,
        muscleGroups: targetMuscle,
        difficulty: difficulty || 'BEGINNER',
        instructions: instructions || '',
        equipment: equipment || 'BODYWEIGHT',
        description: category || 'STRENGTH',
        createdByUserId,
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error('Create exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to create exercise' },
      { status: 500 },
    );
  }
}

// Update an existing exercise. Trainers can only edit exercises they
// personally created; admins can edit anything.
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, targetMuscle, difficulty, instructions, equipment, category } = body;

    if (!id || !name || !targetMuscle) {
      return NextResponse.json(
        { message: 'Exercise ID, name, and target muscle are required' },
        { status: 400 },
      );
    }

    const existing = await prisma.exercise.findUnique({
      where: { id },
      select: { id: true, createdByUserId: true },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const callerUser = {
      id: session.user.id,
      role: session.user.role as 'CLIENT' | 'TRAINER' | 'ADMIN',
    };
    if (!canMutateExercise(callerUser, existing)) {
      // 404 instead of 403 so trainers can't enumerate other trainers'
      // custom exercises by poking at ids.
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        name,
        muscleGroups: targetMuscle,
        difficulty: difficulty || 'BEGINNER',
        instructions: instructions || '',
        equipment: equipment || 'BODYWEIGHT',
        description: category || 'STRENGTH',
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    console.error('Update exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to update exercise' },
      { status: 500 },
    );
  }
}

// Delete an exercise. Ownership check matches PUT.
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'TRAINER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Exercise ID is required' },
        { status: 400 },
      );
    }

    const existing = await prisma.exercise.findUnique({
      where: { id },
      select: { id: true, createdByUserId: true },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    const callerUser = {
      id: session.user.id,
      role: session.user.role as 'CLIENT' | 'TRAINER' | 'ADMIN',
    };
    if (!canMutateExercise(callerUser, existing)) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    // Check if exercise is used in any workout templates
    const usedInWorkouts = await prisma.workoutExercise.findFirst({
      where: { exerciseId: id },
    });

    if (usedInWorkouts) {
      return NextResponse.json(
        { message: 'Cannot delete exercise: it is currently used in workout templates' },
        { status: 400 },
      );
    }

    await prisma.exercise.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Exercise deleted successfully' });
  } catch (error) {
    console.error('Delete exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to delete exercise' },
      { status: 500 },
    );
  }
}
