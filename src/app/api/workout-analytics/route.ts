import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    
    // Get session to verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get workout progress
    const workoutProgress = await prisma.workoutProgress.findMany({
      where: { userId: user.id },
      include: {
        exercise: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    // Calculate strongest exercise
    const strongestExercise = workoutProgress
      .filter(p => p.weight && p.weight > 0)
      .reduce((max, current) => {
        return current.weight! > (max?.weight || 0) ? current : max;
      }, null as typeof workoutProgress[0] | null);

    // Calculate exercise improvements (percentage gains)
    const exerciseImprovements = new Map<string, { first: number; latest: number; exerciseName: string }>();
    
    const sortedProgress = [...workoutProgress].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedProgress.forEach(progress => {
      if (!progress.weight || progress.weight <= 0) return;
      
      const exerciseId = progress.exerciseId;
      const current = exerciseImprovements.get(exerciseId);
      
      if (!current) {
        exerciseImprovements.set(exerciseId, {
          first: progress.weight,
          latest: progress.weight,
          exerciseName: progress.exercise.name
        });
      } else {
        // Update latest weight (chronologically)
        current.latest = progress.weight;
      }
    });

    // Find most improved exercise
    let mostImproved = { exerciseName: 'None', percentage: 0 };
    exerciseImprovements.forEach(({ first, latest, exerciseName }) => {
      if (first > 0 && latest !== first) {
        const improvement = ((latest - first) / first) * 100;
        if (improvement > mostImproved.percentage) {
          mostImproved = { exerciseName, percentage: improvement };
        }
      }
    });

    // Calculate weekly frequency
    const now = new Date();
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const recentSessions = await prisma.workoutSession.count({
      where: {
        userId: user.id,
        completed: true,
        startTime: {
          gte: fourWeeksAgo
        }
      }
    });
    const weeklyFrequency = (recentSessions / 4).toFixed(1);

    const analytics = {
      strongestExercise: strongestExercise ? {
        name: strongestExercise.exercise.name,
        weight: strongestExercise.weight,
        formatted: `${strongestExercise.weight}lbs`
      } : null,
      mostImproved: mostImproved.percentage > 0 ? {
        exerciseName: mostImproved.exerciseName,
        percentage: mostImproved.percentage,
        formatted: `${mostImproved.percentage.toFixed(1)}%`
      } : null,
      weeklyFrequency: {
        value: parseFloat(weeklyFrequency),
        formatted: weeklyFrequency
      },
      totalProgress: workoutProgress.length,
      totalWorkouts: await prisma.workoutSession.count({
        where: { userId: user.id, completed: true }
      })
    };

    return NextResponse.json(analytics);

  } catch (error) {
    console.error('❌ Workout analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}