import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function addTestWorkoutData() {
  try {
    console.log('🏋️ Adding test workout/exercise data...');
    
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

    // Create exercise data if it doesn't exist
    const exercises = [
      { 
        name: 'Bench Press', 
        muscleGroups: ['Chest', 'Triceps'], 
        difficulty: 'INTERMEDIATE', 
        instructions: ['Lie on bench', 'Lower bar to chest', 'Press bar up'],
        description: 'Classic chest building exercise'
      },
      { 
        name: 'Squats', 
        muscleGroups: ['Legs', 'Glutes'], 
        difficulty: 'INTERMEDIATE', 
        instructions: ['Stand with feet shoulder width', 'Lower into squat', 'Push through heels'],
        description: 'Fundamental leg strength exercise'
      },
      { 
        name: 'Deadlift', 
        muscleGroups: ['Back', 'Hamstrings'], 
        difficulty: 'ADVANCED', 
        instructions: ['Feet hip width apart', 'Grip bar', 'Lift with legs and back'],
        description: 'Full body strength exercise'
      },
      { 
        name: 'Pull-ups', 
        muscleGroups: ['Back', 'Biceps'], 
        difficulty: 'INTERMEDIATE', 
        instructions: ['Hang from bar', 'Pull body up', 'Lower with control'],
        description: 'Upper body pulling exercise'
      },
      { 
        name: 'Shoulder Press', 
        muscleGroups: ['Shoulders', 'Triceps'], 
        difficulty: 'BEGINNER', 
        instructions: ['Hold weights at shoulder level', 'Press overhead', 'Lower with control'],
        description: 'Shoulder strength and stability'
      }
    ];

    // Create or find exercises
    const createdExercises = [];
    for (const exercise of exercises) {
      const existing = await prisma.exercise.findFirst({
        where: { name: exercise.name }
      });
      
      if (!existing) {
        const created = await prisma.exercise.create({
          data: exercise
        });
        createdExercises.push(created);
      } else {
        createdExercises.push(existing);
      }
    }

    console.log('✅ Created/found', createdExercises.length, 'exercises');

    // Generate workout data for the past 12 months
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    
    // Create workouts (2-3 per week for 12 months)
    const workoutDates = [];
    
    // Generate workout dates (2-3 times per week)
    for (let week = 0; week < 52; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (week * 7));
      
      // Monday, Wednesday, Friday workouts
      [1, 3, 5].forEach(dayOffset => {
        const workoutDate = new Date(weekStart);
        workoutDate.setDate(weekStart.getDate() + dayOffset);
        if (workoutDate <= new Date()) {
          workoutDates.push(workoutDate);
        }
      });
    }

    console.log('📅 Generated', workoutDates.length, 'workout dates');

    // Clear existing workouts for this user
    await prisma.workoutExercise.deleteMany({
      where: { workout: { createdBy: user.id } }
    });
    await prisma.workout.deleteMany({
      where: { createdBy: user.id }
    });
    
    console.log('🗑️ Cleared existing workout data');

    // Create workouts with progressive overload
    for (let i = 0; i < Math.min(workoutDates.length, 100); i++) { // Limit to 100 workouts
      const workoutDate = workoutDates[i];
      const progressFactor = i / 100; // 0 to 1 progression over time
      
      // Create workout
      const workout = await prisma.workout.create({
        data: {
          createdBy: user.id,
          title: `Workout ${i + 1}`,
          description: `Progressive training session`,
          difficulty: 'INTERMEDIATE',
          type: 'STRENGTH',
          duration: 60 + Math.floor(Math.random() * 30), // 60-90 minutes
          createdAt: workoutDate
        }
      });

      // Add 3-4 exercises per workout
      const workoutExercises = createdExercises.slice(0, 3 + Math.floor(Math.random() * 2));
      
      for (let j = 0; j < workoutExercises.length; j++) {
        const exercise = workoutExercises[j];
        
        // Progressive weights and reps
        let baseWeight = 135; // Starting weight
        if (exercise.name === 'Bench Press') baseWeight = 135;
        else if (exercise.name === 'Squats') baseWeight = 185;
        else if (exercise.name === 'Deadlift') baseWeight = 225;
        else if (exercise.name === 'Shoulder Press') baseWeight = 95;
        else if (exercise.name === 'Pull-ups') baseWeight = 0; // Bodyweight
        
        const progressedWeight = Math.round(baseWeight + (progressFactor * baseWeight * 0.4)); // 40% increase over time
        const sets = 3 + Math.floor(Math.random() * 2); // 3-4 sets
        const reps = 8 + Math.floor(Math.random() * 5); // 8-12 reps
        
        await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            sets,
            reps,
            weight: exercise.name === 'Pull-ups' ? null : progressedWeight,
            restTime: 60 + Math.floor(Math.random() * 60), // 60-120 seconds rest
            order: j + 1,
            notes: `Week ${Math.floor(i / 3) + 1} progression`
          }
        });
      }
    }

    console.log('✅ Successfully added workout data');
    console.log('💪 Created', Math.min(workoutDates.length, 100), 'workouts');
    
  } catch (error) {
    console.error('❌ Error adding workout data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addTestWorkoutData();