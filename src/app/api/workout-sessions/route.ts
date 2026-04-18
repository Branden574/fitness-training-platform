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
    const { id, completed, endTime, notes, rating, caloriesBurned } = body as {
      id?: string;
      completed?: boolean;
      endTime?: string | Date;
      notes?: string | null;
      rating?: number | null;
      caloriesBurned?: number | null;
    };

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await prisma.workoutSession.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to update workout session' },
      { status: 500 }
    );
  }
}