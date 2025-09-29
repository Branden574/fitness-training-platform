const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function addEssentialExercises() {
  try {
    console.log('💪 Adding essential exercises for the platform...');

    const exercises = [
      {
        name: 'Push-ups',
        description: 'Classic bodyweight chest exercise',
        instructions: ['Start in plank position', 'Lower body to ground', 'Push back up', 'Repeat'],
        muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Core'],
        equipment: ['Bodyweight'],
        difficulty: 'BEGINNER'
      },
      {
        name: 'Squats',
        description: 'Fundamental lower body exercise',
        instructions: ['Stand with feet shoulder-width apart', 'Lower into sitting position', 'Keep chest up', 'Return to standing'],
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings', 'Core'],
        equipment: ['Bodyweight'],
        difficulty: 'BEGINNER'
      },
      {
        name: 'Plank',
        description: 'Core strengthening isometric exercise',
        instructions: ['Start in push-up position', 'Hold body straight', 'Engage core muscles', 'Breathe normally'],
        muscleGroups: ['Core', 'Shoulders', 'Glutes'],
        equipment: ['Bodyweight'],
        difficulty: 'BEGINNER'
      },
      {
        name: 'Deadlifts',
        description: 'Compound exercise for posterior chain',
        instructions: ['Stand with feet hip-width apart', 'Hinge at hips and knees', 'Lift weight by extending hips', 'Keep back straight'],
        muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back', 'Traps'],
        equipment: ['Barbell', 'Dumbbells'],
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Bench Press',
        description: 'Upper body compound exercise',
        instructions: ['Lie on bench with feet flat', 'Lower bar to chest', 'Press weight up', 'Control the movement'],
        muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
        equipment: ['Barbell', 'Bench'],
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Pull-ups',
        description: 'Upper body pulling exercise',
        instructions: ['Hang from pull-up bar', 'Pull body up until chin over bar', 'Lower with control', 'Repeat'],
        muscleGroups: ['Lats', 'Biceps', 'Rhomboids', 'Core'],
        equipment: ['Pull-up Bar'],
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Lunges',
        description: 'Single-leg strengthening exercise',
        instructions: ['Step forward into lunge position', 'Lower back knee toward ground', 'Push back to starting position', 'Alternate legs'],
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings', 'Calves'],
        equipment: ['Bodyweight', 'Dumbbells'],
        difficulty: 'BEGINNER'
      },
      {
        name: 'Overhead Press',
        description: 'Vertical pushing exercise',
        instructions: ['Stand with core engaged', 'Press weight overhead', 'Keep core tight', 'Lower with control'],
        muscleGroups: ['Shoulders', 'Triceps', 'Core'],
        equipment: ['Barbell', 'Dumbbells'],
        difficulty: 'INTERMEDIATE'
      },
      {
        name: 'Rows',
        description: 'Horizontal pulling exercise',
        instructions: ['Pull weight to torso', 'Squeeze shoulder blades', 'Control the return', 'Keep core engaged'],
        muscleGroups: ['Lats', 'Rhomboids', 'Biceps', 'Rear Delts'],
        equipment: ['Barbell', 'Dumbbells', 'Cable Machine'],
        difficulty: 'BEGINNER'
      },
      {
        name: 'Burpees',
        description: 'Full-body conditioning exercise',
        instructions: ['Start standing', 'Drop to squat position', 'Jump back to plank', 'Do push-up', 'Jump back to squat', 'Jump up with arms overhead'],
        muscleGroups: ['Full Body', 'Cardiovascular'],
        equipment: ['Bodyweight'],
        difficulty: 'ADVANCED'
      }
    ];

    for (const exercise of exercises) {
      await prisma.exercise.create({
        data: {
          name: exercise.name,
          description: exercise.description,
          instructions: exercise.instructions,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty
        }
      });
      console.log(`   ✅ Added: ${exercise.name}`);
    }

    console.log(`\n🎉 Successfully added ${exercises.length} essential exercises!`);

  } catch (error) {
    console.error('❌ Error adding exercises:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addEssentialExercises();