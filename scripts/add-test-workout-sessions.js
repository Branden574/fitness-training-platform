import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addTestWorkoutSessions() {
  try {
    console.log('🎯 Adding test workout sessions...');
    
    // Find Branden Vincent-Walker's user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Branden Vincent-Walker' } },
          { email: { contains: 'branden' } }
        ]
      }
    });

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log('✅ Found user:', user.name);
    
    // Get all workouts we created for this user
    const workouts = await prisma.workout.findMany({
      where: { createdBy: user.id }
    });

    console.log('📋 Found', workouts.length, 'workouts to create sessions for');

    // Clear existing workout sessions for this user
    await prisma.workoutSession.deleteMany({
      where: { userId: user.id }
    });
    
    console.log('🗑️ Cleared existing workout sessions');

    // Create workout sessions for each workout
    let sessionsCreated = 0;
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    for (let i = 0; i < workouts.length; i++) {
      const workout = workouts[i];
      
      // Calculate session date (spread over the year)
      const sessionDate = new Date(startDate);
      sessionDate.setDate(startDate.getDate() + (i * 3)); // Every 3 days
      
      // Create workout session
      await prisma.workoutSession.create({
        data: {
          workoutId: workout.id,
          userId: user.id,
          startTime: sessionDate,
          endTime: new Date(sessionDate.getTime() + (workout.duration * 60 * 1000)), // Add duration in minutes
          completed: true,
          rating: 3 + Math.floor(Math.random() * 3), // 3-5 rating
          notes: [
            'Great workout!',
            'Feeling stronger each session',
            'Progressive overload working well',
            'Good form focus today',
            'Challenging but manageable',
            'Energy was high today'
          ][Math.floor(Math.random() * 6)]
        }
      });

      sessionsCreated++;
      
      // Log progress every 20 sessions
      if (sessionsCreated % 20 === 0) {
        console.log(`⏳ Created ${sessionsCreated}/${workouts.length} workout sessions...`);
      }
    }

    console.log('✅ Successfully added workout sessions');
    console.log('🎯 Created', sessionsCreated, 'workout sessions');
    console.log('📊 Sessions span from', startDate.toDateString(), 'to', new Date().toDateString());
    
    // Verify the data
    const totalSessions = await prisma.workoutSession.count({
      where: { userId: user.id, completed: true }
    });
    
    console.log('✅ Verification: Found', totalSessions, 'completed sessions for user');
    
  } catch (error) {
    console.error('❌ Error adding workout sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addTestWorkoutSessions();