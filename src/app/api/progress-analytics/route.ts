import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ExerciseProgress {
  date: string;
  exerciseName: string;
  weight: number;
  sets: number;
  reps: number;
  volume: number; // weight * sets * reps
  oneRepMax: number; // calculated 1RM
}

interface ProgressAnalytics {
  exerciseProgress: ExerciseProgress[];
  monthlyStats: {
    month: string;
    totalVolume: number;
    averageWeight: number;
    totalWorkouts: number;
    strengthGain: number;
  }[];
  exerciseSpecificTrends: {
    [exerciseName: string]: {
      weightProgression: { date: string; weight: number }[];
      volumeProgression: { date: string; volume: number }[];
      strengthProgression: { date: string; oneRepMax: number }[];
    };
  };
  overallMetrics: {
    totalWorkoutsCompleted: number;
    averageWorkoutFrequency: number;
    strongestExercises: { name: string; maxWeight: number }[];
    mostImprovedExercises: { name: string; improvement: number }[];
  };
}

// Calculate estimated 1 rep max using Epley formula
function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const timeRange = searchParams.get('timeRange') || '6months'; // 3months, 6months, 1year

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine target user (for trainers viewing client data)
    let targetUserId = user.id;
    if (user.role === 'TRAINER' && clientId) {
      const client = await prisma.user.findFirst({
        where: { 
          id: clientId,
          trainerId: user.id 
        }
      });
      if (client) {
        targetUserId = client.id;
      }
    }

    // Calculate date range
    const timeRangeMap = {
      '3months': 90,
      '6months': 180,
      '1year': 365
    };
    const daysBack = timeRangeMap[timeRange as keyof typeof timeRangeMap] || 180;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Fetch workout progress data
    const workoutProgress = await prisma.workoutProgress.findMany({
      where: {
        workoutSession: {
          userId: targetUserId,
          startTime: {
            gte: startDate
          }
        }
      },
      include: {
        exercise: true,
        workoutSession: true
      },
      orderBy: {
        workoutSession: {
          startTime: 'asc'
        }
      }
    });

    // Fetch daily progress entries (weight, body fat, mood, etc.)
    const progressEntries = await prisma.progressEntry.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: startDate
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`Found ${workoutProgress.length} workout progress entries and ${progressEntries.length} daily progress entries`);    console.log(`📊 Found ${workoutProgress.length} workout progress entries for analytics`);

    // Process data for analytics
    const exerciseProgress: ExerciseProgress[] = workoutProgress.map(progress => {
      const volume = (progress.weight || 0) * (progress.sets || 0) * (progress.reps || 0);
      const oneRepMax = calculateOneRepMax(progress.weight || 0, progress.reps || 1);
      
      return {
        date: progress.workoutSession.startTime.toISOString().split('T')[0],
        exerciseName: progress.exercise?.name || 'Unknown Exercise',
        weight: progress.weight || 0,
        sets: progress.sets || 0,
        reps: progress.reps || 0,
        volume,
        oneRepMax
      };
    });

    // Group by month for monthly stats
    const monthlyData = new Map<string, {
      totalVolume: number;
      totalWeight: number;
      workoutCount: number;
      weightEntries: number;
      exerciseNames: Set<string>;
    }>();

    exerciseProgress.forEach(entry => {
      const monthKey = entry.date.slice(0, 7); // YYYY-MM format
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          totalVolume: 0,
          totalWeight: 0,
          workoutCount: 0,
          weightEntries: 0,
          exerciseNames: new Set()
        });
      }
      
      const monthData = monthlyData.get(monthKey)!;
      monthData.totalVolume += entry.volume;
      if (entry.weight > 0) {
        monthData.totalWeight += entry.weight;
        monthData.weightEntries++;
      }
      monthData.exerciseNames.add(entry.exerciseName);
    });

    // Calculate workout sessions per month
    const workoutSessions = await prisma.workoutSession.findMany({
      where: {
        userId: targetUserId,
        startTime: {
          gte: startDate
        }
      }
    });

    const sessionsPerMonth = new Map<string, number>();
    workoutSessions.forEach(session => {
      const monthKey = session.startTime.toISOString().slice(0, 7);
      sessionsPerMonth.set(monthKey, (sessionsPerMonth.get(monthKey) || 0) + 1);
    });

    // Build monthly stats combining workout progress and daily progress
    const allMonthsSet = new Set<string>();
    
    // Add months from workout progress
    monthlyData.forEach((_, month) => allMonthsSet.add(month));
    
    // Add months from daily progress entries
    progressEntries.forEach(entry => {
      // Extract UTC date components to avoid timezone issues
      const utcYear = entry.date.getUTCFullYear();
      const utcMonth = String(entry.date.getUTCMonth() + 1).padStart(2, '0');
      const monthKey = `${utcYear}-${utcMonth}`; // YYYY-MM
      allMonthsSet.add(monthKey);
    });

    const monthlyStats = Array.from(allMonthsSet)
      .sort()
      .map(month => {
        const workoutData = monthlyData.get(month) || {
          totalVolume: 0,
          totalWeight: 0,
          weightEntries: 0,
          exerciseNames: new Set()
        };
        
        // Get daily progress data for this month
        const monthlyProgressEntries = progressEntries.filter(entry => {
          const utcYear = entry.date.getUTCFullYear();
          const utcMonth = String(entry.date.getUTCMonth() + 1).padStart(2, '0');
          const entryMonth = `${utcYear}-${utcMonth}`;
          return entryMonth === month;
        });
        
        // Calculate averages for daily progress metrics
        const weights = monthlyProgressEntries.map(e => e.weight).filter(w => w !== null) as number[];
        const bodyFats = monthlyProgressEntries.map(e => e.bodyFat).filter(bf => bf !== null) as number[];
        const moods = monthlyProgressEntries.map(e => e.mood).filter(m => m !== null) as number[];
        const energies = monthlyProgressEntries.map(e => e.energy).filter(e => e !== null) as number[];
        const sleeps = monthlyProgressEntries.map(e => e.sleep).filter(s => s !== null) as number[];
        
        const previousMonth = monthlyData.get(getPreviousMonth(month));
        const strengthGain = previousMonth 
          ? ((workoutData.totalVolume - previousMonth.totalVolume) / previousMonth.totalVolume) * 100
          : 0;

        return {
          month,
          date: `${month}-01`, // Add a proper date field for sorting
          totalVolume: workoutData.totalVolume,
          averageWeight: workoutData.weightEntries > 0 ? workoutData.totalWeight / workoutData.weightEntries : 0,
          totalWorkouts: sessionsPerMonth.get(month) || 0,
          strengthGain: Math.round(strengthGain * 100) / 100,
          // Daily progress metrics
          weight: weights.length > 0 ? weights[weights.length - 1] : null, // Latest weight in month
          bodyFat: bodyFats.length > 0 ? bodyFats[bodyFats.length - 1] : null,
          mood: moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
          energy: energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : null,
          muscleMass: null, // Can be calculated if needed
          workoutVolume: workoutData.totalVolume,
          // Additional stats
          progressEntries: monthlyProgressEntries.length,
          averageSleep: sleeps.length > 0 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null
        };
      });

    // Exercise-specific trends
    const exerciseSpecificTrends: ProgressAnalytics['exerciseSpecificTrends'] = {};
    
    const exerciseGroups = exerciseProgress.reduce((acc, entry) => {
      if (!acc[entry.exerciseName]) {
        acc[entry.exerciseName] = [];
      }
      acc[entry.exerciseName].push(entry);
      return acc;
    }, {} as Record<string, ExerciseProgress[]>);

    Object.entries(exerciseGroups).forEach(([exerciseName, entries]) => {
      const sortedEntries = entries.sort((a, b) => a.date.localeCompare(b.date));
      
      exerciseSpecificTrends[exerciseName] = {
        weightProgression: sortedEntries.map(e => ({ date: e.date, weight: e.weight })),
        volumeProgression: sortedEntries.map(e => ({ date: e.date, volume: e.volume })),
        strengthProgression: sortedEntries.map(e => ({ date: e.date, oneRepMax: e.oneRepMax }))
      };
    });

    // Overall metrics
    const exerciseStats = Object.entries(exerciseGroups).map(([name, entries]) => {
      const weights = entries.map(e => e.weight).filter(w => w > 0);
      const maxWeight = Math.max(...weights);
      const minWeight = Math.min(...weights);
      const improvement = weights.length > 1 ? ((maxWeight - minWeight) / minWeight) * 100 : 0;
      
      return { name, maxWeight, improvement };
    });

    const overallMetrics = {
      totalWorkoutsCompleted: workoutSessions.length,
      averageWorkoutFrequency: workoutSessions.length / Math.max(1, daysBack / 7), // per week
      strongestExercises: exerciseStats
        .sort((a, b) => b.maxWeight - a.maxWeight)
        .slice(0, 5),
      mostImprovedExercises: exerciseStats
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 5)
    };

    const analytics: ProgressAnalytics = {
      exerciseProgress,
      monthlyStats,
      exerciseSpecificTrends,
      overallMetrics
    };

    console.log(`✅ Generated analytics with ${monthlyStats.length} months of data`);
    return NextResponse.json(analytics);

  } catch (error) {
    console.error('Progress analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getPreviousMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}