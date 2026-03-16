import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Get all available exercises
export async function GET() {
  try {
    
    const exercises = await prisma.exercise.findMany({
      orderBy: [
        { difficulty: 'asc' },
        { name: 'asc' }
      ],
      take: 200,
    });

    return NextResponse.json(exercises);
    
  } catch (error) {
    console.error('Get exercises error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new exercise
export async function POST(request: Request) {
  try {
    
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, targetMuscle, difficulty, instructions, equipment, category } = body;

    if (!name || !targetMuscle) {
      return NextResponse.json(
        { message: 'Exercise name and target muscle are required' },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        muscleGroups: targetMuscle, // Map targetMuscle to muscleGroups field
        difficulty: difficulty || 'BEGINNER',
        instructions: instructions || '',
        equipment: equipment || 'BODYWEIGHT',
        description: category || 'STRENGTH' // Map category to description for now
      }
    });

    return NextResponse.json(exercise);
    
  } catch (error) {
    console.error('Create exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}

// Update an existing exercise
export async function PUT(request: Request) {
  try {
    
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, targetMuscle, difficulty, instructions, equipment, category } = body;

    if (!id || !name || !targetMuscle) {
      return NextResponse.json(
        { message: 'Exercise ID, name, and target muscle are required' },
        { status: 400 }
      );
    }

    const exercise = await prisma.exercise.update({
      where: { id },
      data: {
        name,
        muscleGroups: targetMuscle, // Map targetMuscle to muscleGroups field
        difficulty: difficulty || 'BEGINNER',
        instructions: instructions || '',
        equipment: equipment || 'BODYWEIGHT',
        description: category || 'STRENGTH' // Map category to description for now
      }
    });

    return NextResponse.json(exercise);
    
  } catch (error) {
    console.error('Update exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to update exercise' },
      { status: 500 }
    );
  }
}

// Delete an exercise
export async function DELETE(request: Request) {
  try {
    
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Exercise ID is required' },
        { status: 400 }
      );
    }

    // Check if exercise is used in any workout templates
    const usedInWorkouts = await prisma.workoutExercise.findFirst({
      where: { exerciseId: id }
    });

    if (usedInWorkouts) {
      return NextResponse.json(
        { message: 'Cannot delete exercise: it is currently used in workout templates' },
        { status: 400 }
      );
    }

    await prisma.exercise.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Exercise deleted successfully' });
    
  } catch (error) {
    console.error('Delete exercise error:', error);
    return NextResponse.json(
      { message: 'Failed to delete exercise' },
      { status: 500 }
    );
  }
}