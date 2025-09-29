import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const createWorkoutSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  duration: z.number().min(5).max(180), // 5 minutes to 3 hours
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  type: z.enum(['STRENGTH', 'CARDIO', 'FLEXIBILITY', 'MIXED']).default('STRENGTH'),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    sets: z.number().min(1).max(10),
    reps: z.number().min(1).max(100),
    weight: z.number().optional(),
    duration: z.number().optional(), // in seconds
    restTime: z.number().optional(), // in seconds
    notes: z.string().optional(),
    order: z.number().min(1)
  }))
});

// Get workout templates created by trainer
export async function GET() {
  try {
    console.log('🔍 Workout Templates API - GET request');
    
    // Get session to verify user is authenticated and get their user ID
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the trainer using session email
    const trainer = await prisma.user.findUnique({
      where: { email: session.user.email, role: 'TRAINER' }
    });

    if (!trainer) {
      console.log('❌ Trainer not found');
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const workouts = await prisma.workout.findMany({
      where: {
        createdBy: trainer.id
      },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            sessions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(workouts);
    
  } catch (error) {
    console.error('Get workout templates error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new workout template
export async function POST(request: Request) {
  try {
    console.log('🔍 Workout Templates POST API - Creating workout template');
    
    // Get session to verify user is authenticated and get their user ID
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the trainer using session email
    const trainer = await prisma.user.findUnique({
      where: { email: session.user.email, role: 'TRAINER' }
    });

    if (!trainer) {
      console.log('❌ Trainer not found');
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = createWorkoutSchema.parse(body);

    const workout = await prisma.workout.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        duration: validatedData.duration,
        difficulty: validatedData.difficulty,
        type: validatedData.type,
        createdBy: trainer.id,
        exercises: {
          create: validatedData.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restTime: ex.restTime,
            notes: ex.notes,
            order: ex.order
          }))
        }
      },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return NextResponse.json(workout);
    
  } catch (error) {
    console.error('Create workout template error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update workout template
export async function PUT(request: Request) {
  try {
    console.log('🔍 Workout Templates PUT API - Updating workout template');
    
    // Get session to verify user is authenticated and get their user ID
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the trainer using session email
    const trainer = await prisma.user.findUnique({
      where: { email: session.user.email, role: 'TRAINER' }
    });

    if (!trainer) {
      console.log('❌ Trainer not found');
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, ...data } = body;
    const validatedData = createWorkoutSchema.parse(data);

    // Verify workout belongs to this trainer
    const existingWorkout = await prisma.workout.findFirst({
      where: {
        id,
        createdBy: trainer.id
      }
    });

    if (!existingWorkout) {
      return NextResponse.json(
        { message: 'Workout not found or not owned by you' },
        { status: 404 }
      );
    }

    // Delete existing exercises and recreate them
    await prisma.workoutExercise.deleteMany({
      where: { workoutId: id }
    });

    const updatedWorkout = await prisma.workout.update({
      where: { id },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        duration: validatedData.duration,
        difficulty: validatedData.difficulty,
        type: validatedData.type,
        exercises: {
          create: validatedData.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restTime: ex.restTime,
            notes: ex.notes,
            order: ex.order
          }))
        }
      },
      include: {
        exercises: {
          include: {
            exercise: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    return NextResponse.json(updatedWorkout);
    
  } catch (error) {
    console.error('Update workout template error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          message: 'Validation error',
          errors: error.issues 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete workout template
export async function DELETE(request: Request) {
  try {
    console.log('🔍 Workout Templates DELETE API - Deleting workout template');
    
    // Get session to verify user is authenticated and get their user ID
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the trainer using session email
    const trainer = await prisma.user.findUnique({
      where: { email: session.user.email, role: 'TRAINER' }
    });

    if (!trainer) {
      console.log('❌ Trainer not found');
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('id');

    if (!workoutId) {
      return NextResponse.json(
        { message: 'Workout ID is required' },
        { status: 400 }
      );
    }

    // Verify workout belongs to this trainer
    const workout = await prisma.workout.findFirst({
      where: {
        id: workoutId,
        createdBy: trainer.id
      }
    });

    if (!workout) {
      return NextResponse.json(
        { message: 'Workout not found or not owned by you' },
        { status: 404 }
      );
    }

    // Delete the workout (this will cascade delete exercises)
    await prisma.workout.delete({
      where: { id: workoutId }
    });

    return NextResponse.json({ message: 'Workout deleted successfully' });
    
  } catch (error) {
    console.error('Delete workout template error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}