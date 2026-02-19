// Test script to verify timezone fix for workout logging
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function testWorkoutDateHandling() {
  try {
    console.log('🧪 Testing workout date handling...');
    
    // Get Pacific Time date for today (9/24/2025)
    const today = new Date();
    const pacificDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log('📅 Today in Pacific Time:', {
      fullDate: pacificDate.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }),
      dateString: pacificDate.toISOString().split('T')[0],
      month: pacificDate.getMonth() + 1,
      day: pacificDate.getDate(),
      year: pacificDate.getFullYear()
    });

    // Check latest workout progress entries
    console.log('\n🏋️ Recent Workout Progress Entries:');
    const recentProgress = await prisma.workoutProgress.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 5,
      include: {
        user: {
          select: { name: true, email: true }
        },
        exercise: {
          select: { name: true }
        }
      }
    });

    recentProgress.forEach(entry => {
      const entryDate = new Date(entry.date);
      console.log(`  📊 ${entry.user.name}: ${entry.exercise?.name || 'Exercise'}`);
      console.log(`      Date stored: ${entry.date}`);
      console.log(`      Displays as: ${entryDate.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      console.log(`      Weight: ${entry.weight}lbs, Sets: ${entry.sets}, Reps: ${entry.reps}`);
      console.log('');
    });

    // Check latest workout sessions
    console.log('🎯 Recent Workout Sessions:');
    const recentSessions = await prisma.workoutSession.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 3,
      include: {
        user: {
          select: { name: true, email: true }
        },
        workout: {
          select: { title: true }
        }
      }
    });

    recentSessions.forEach(session => {
      const sessionDate = new Date(session.startTime);
      const createdDate = new Date(session.createdAt);
      console.log(`  🎯 ${session.user.name}: ${session.workout?.title || 'Workout'}`);
      console.log(`      Start time: ${session.startTime}`);
      console.log(`      Displays as: ${sessionDate.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      console.log(`      Created: ${createdDate.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkoutDateHandling();