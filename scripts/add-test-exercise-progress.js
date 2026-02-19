import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addTestWorkoutProgress() {
  try {
    console.log('💪 Adding test workout progress...');
    
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
    
    // Get workout sessions we created
    const workoutSessions = await prisma.workoutSession.findMany({
      where: { userId: user.id },
      include: {
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true
              }
            }
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    console.log('🏋️ Found', workoutSessions.length, 'workout sessions to create progress for');

    // Clear existing workout progress
    await prisma.workoutProgress.deleteMany({
      where: { userId: user.id }
    });
    
    console.log('🗑️ Cleared existing workout progress');

    // Create workout progress records
    let progressCreated = 0;
    
    for (let i = 0; i < workoutSessions.length; i++) {
      const session = workoutSessions[i];
      
      // Create progress for each exercise in this workout
      for (let j = 0; j < session.workout.exercises.length; j++) {
        const workoutExercise = session.workout.exercises[j];
        
        // Create workout progress
        await prisma.workoutProgress.create({
          data: {
            userId: user.id,
            exerciseId: workoutExercise.exerciseId,
            workoutSessionId: session.id,
            weight: workoutExercise.weight,
            reps: workoutExercise.reps,
            sets: workoutExercise.sets,
            notes: workoutExercise.notes || `Session ${i + 1} progress`,
            date: session.startTime
          }
        });

        progressCreated++;
      }
      
      // Log progress every 20 sessions
      if ((i + 1) % 20 === 0) {
        console.log(`⏳ Processed ${i + 1}/${workoutSessions.length} workout sessions...`);
      }
    }

    console.log('✅ Successfully added workout progress');
    console.log('💪 Created', progressCreated, 'workout progress records');
    
    // Get strongest exercise (highest weight)
    const strongestExercise = await prisma.workoutProgress.findFirst({
      where: { 
        userId: user.id,
        weight: { not: null }
      },
      include: { exercise: true },
      orderBy: { weight: 'desc' }
    });

    if (strongestExercise) {
      console.log('🏆 Strongest exercise:', strongestExercise.exercise.name, 'at', strongestExercise.weight, 'lbs');
    }
    
    // Calculate weekly frequency
    const totalWeeks = 52; // 1 year
    const totalSessions = workoutSessions.length;
    const weeklyFrequency = (totalSessions / totalWeeks).toFixed(1);
    
    console.log('📊 Weekly workout frequency:', weeklyFrequency, 'sessions per week');
    
  } catch (error) {
    console.error('❌ Error adding exercise progress:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addTestWorkoutProgress();