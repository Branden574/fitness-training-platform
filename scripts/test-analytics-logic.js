// Direct test of progress analytics logic without auth
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Simulate the progress analytics logic
async function testProgressAnalyticsLogic() {
  try {
    console.log('🧪 Testing progress analytics logic...');
    
    // Get the user we know has data (Branden Vincent-Walker)
    const user = await prisma.user.findFirst({
      where: { name: 'Branden Vincent-Walker' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (ID: ${user.id})`);
    
    // Simulate the API logic for 6 months timeRange
    const daysBack = 180; // 6 months
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    console.log(`📅 Looking for data from ${startDate.toISOString().split('T')[0]} to now`);
    
    // Fetch workout progress data (same as API)
    const workoutProgress = await prisma.workoutProgress.findMany({
      where: {
        workoutSession: {
          userId: user.id,
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
    
    console.log(`💪 Found ${workoutProgress.length} workout progress entries`);
    
    // Process into exercise progress (same as API)
    const exerciseProgress = workoutProgress.map(progress => {
      const volume = (progress.weight || 0) * (progress.sets || 0) * (progress.reps || 0);
      
      return {
        date: progress.workoutSession.startTime.toISOString().split('T')[0],
        exerciseName: progress.exercise?.name || 'Unknown Exercise',
        weight: progress.weight || 0,
        sets: progress.sets || 0,
        reps: progress.reps || 0,
        volume
      };
    });
    
    console.log('📊 Exercise progress entries:');
    exerciseProgress.forEach(entry => {
      console.log(`  - ${entry.date}: ${entry.exerciseName}, ${entry.weight}lbs x ${entry.sets}x${entry.reps} = ${entry.volume} volume`);
    });
    
    // Group by month for monthly stats (same as API)
    const monthlyData = new Map();
    
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
      
      const monthData = monthlyData.get(monthKey);
      monthData.totalVolume += entry.volume;
      if (entry.weight > 0) {
        monthData.totalWeight += entry.weight;
        monthData.weightEntries++;
      }
      monthData.exerciseNames.add(entry.exerciseName);
    });
    
    console.log('📈 Monthly data breakdown:');
    for (const [month, data] of monthlyData.entries()) {
      console.log(`  - ${month}: ${data.totalVolume} total volume, ${data.weightEntries} weight entries, ${data.exerciseNames.size} exercises`);
    }
    
    // Build monthly stats array (same as API)
    const monthlyStats = Array.from(monthlyData.entries())
      .sort()
      .map(([month, data]) => ({
        month,
        date: `${month}-01`,
        totalVolume: data.totalVolume,
        averageWeight: data.weightEntries > 0 ? data.totalWeight / data.weightEntries : 0,
        totalWorkouts: 1, // Simplified
        strengthGain: 0,
        weight: null,
        bodyFat: null,
        mood: null,
        energy: null,
        workoutVolume: data.totalVolume
      }));
      
    console.log('📊 Final monthly stats:');
    monthlyStats.forEach(stat => {
      console.log(`  - ${stat.month}: Volume=${stat.totalVolume}, AvgWeight=${stat.averageWeight}`);
    });
    
    // Simulate what the API should return
    const apiResponse = {
      exerciseProgress,
      monthlyStats,
      exerciseSpecificTrends: {},
      overallMetrics: {
        totalWorkoutsCompleted: workoutProgress.length
      }
    };
    
    console.log('\n🎯 ANALYSIS:');
    console.log(`- Exercise progress entries: ${apiResponse.exerciseProgress.length}`);
    console.log(`- Monthly stats entries: ${apiResponse.monthlyStats.length}`);
    console.log(`- Should show "No Progress Data"? ${apiResponse.exerciseProgress.length === 0 && apiResponse.monthlyStats.length === 0}`);
    
    if (apiResponse.exerciseProgress.length > 0 || apiResponse.monthlyStats.length > 0) {
      console.log('✅ Progress charts SHOULD display data!');
    } else {
      console.log('❌ Progress charts will show "No Progress Data"');
    }
    
  } catch (error) {
    console.error('❌ Error testing analytics logic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProgressAnalyticsLogic();