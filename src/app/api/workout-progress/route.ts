import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        console.log('📅 Workout Progress API - Date parsing debug:');
        console.log('  Received date:', date);
        console.log('  Parsed as local date:', workoutDate);
        console.log('  ISO string:', workoutDate.toISOString());
        console.log('  Will display as:', workoutDate.toLocaleDateString());
      } else {
        // Handle ISO string or Date object
        workoutDate = new Date(date);
        console.log('📅 Workout Progress API - ISO date handling:', workoutDate);
      }
    } else {
      workoutDate = workoutSession.startTime || new Date();
      console.log('📅 Workout Progress API - Using session date:', workoutDate);
    }

    // Save progress for each exercise
    const progressEntries = await Promise.all(
      exercises.map(async (exercise: { 
        exerciseId: string; 
        exerciseName?: string;
        weight?: number; 
        reps?: number; 
        sets?: number; 
        duration?: number; 
        notes?: string 
      }) => {
        return prisma.workoutProgress.create({
          data: {
            userId: session.user.id,
            exerciseId: exercise.exerciseId,
            workoutSessionId: workoutSessionId,
            weight: exercise.weight || null,
            sets: exercise.sets || null,
            reps: exercise.reps || null,
            notes: exercise.notes || null,
            date: workoutDate
          }
        });
      })
    );

    return NextResponse.json({ 
      message: 'Workout progress saved successfully',
      progress: progressEntries
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