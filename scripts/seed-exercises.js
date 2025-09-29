const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedExercises() {
  console.log('🌱 Seeding exercises...');

  const exercises = [
    {
      name: 'Push-ups',
      description: 'A bodyweight exercise that targets chest, shoulders, and triceps',
      instructions: JSON.stringify([
        'Start in plank position with hands shoulder-width apart',
        'Lower your body until chest nearly touches the floor',
        'Push back up to starting position',
        'Keep your body in a straight line throughout'
      ]),
      muscleGroups: JSON.stringify(['Chest', 'Shoulders', 'Triceps', 'Core']),
      equipment: JSON.stringify(['Bodyweight']),
      difficulty: 'BEGINNER'
    },
    {
      name: 'Squats',
      description: 'A compound exercise targeting legs and glutes',
      instructions: JSON.stringify([
        'Stand with feet shoulder-width apart',
        'Lower your body as if sitting back into a chair',
        'Keep your chest up and knees behind toes',
        'Return to starting position'
      ]),
      muscleGroups: JSON.stringify(['Quadriceps', 'Glutes', 'Hamstrings', 'Core']),
      equipment: JSON.stringify(['Bodyweight']),
      difficulty: 'BEGINNER'
    },
    {
      name: 'Deadlifts',
      description: 'A compound exercise that targets the posterior chain',
      instructions: JSON.stringify([
        'Stand with feet hip-width apart, barbell over mid-foot',
        'Bend at hips and knees to grip the bar',
        'Keep back straight, lift by extending hips and knees',
        'Stand tall, then reverse the movement'
      ]),
      muscleGroups: JSON.stringify(['Hamstrings', 'Glutes', 'Erector Spinae', 'Traps']),
      equipment: JSON.stringify(['Barbell', 'Plates']),
      difficulty: 'INTERMEDIATE'
    },
    {
      name: 'Bench Press',
      description: 'A compound upper body exercise',
      instructions: JSON.stringify([
        'Lie on bench with eyes under the bar',
        'Grip bar with hands wider than shoulders',
        'Unrack and lower bar to chest',
        'Press back up to starting position'
      ]),
      muscleGroups: JSON.stringify(['Chest', 'Shoulders', 'Triceps']),
      equipment: JSON.stringify(['Barbell', 'Bench', 'Plates']),
      difficulty: 'INTERMEDIATE'
    },
    {
      name: 'Pull-ups',
      description: 'A bodyweight exercise for back and biceps',
      instructions: JSON.stringify([
        'Hang from pull-up bar with overhand grip',
        'Pull your body up until chin is over the bar',
        'Lower yourself back down with control',
        'Keep core engaged throughout'
      ]),
      muscleGroups: JSON.stringify(['Latissimus Dorsi', 'Biceps', 'Rhomboids', 'Core']),
      equipment: JSON.stringify(['Pull-up Bar']),
      difficulty: 'INTERMEDIATE'
    },
    {
      name: 'Lunges',
      description: 'A single-leg exercise for lower body strength',
      instructions: JSON.stringify([
        'Step forward with one leg',
        'Lower your hips until both knees are bent at 90 degrees',
        'Push back to starting position',
        'Repeat with other leg'
      ]),
      muscleGroups: JSON.stringify(['Quadriceps', 'Glutes', 'Hamstrings']),
      equipment: JSON.stringify(['Bodyweight']),
      difficulty: 'BEGINNER'
    },
    {
      name: 'Planks',
      description: 'An isometric core strengthening exercise',
      instructions: JSON.stringify([
        'Start in push-up position',
        'Lower to forearms while keeping body straight',
        'Hold position while breathing normally',
        'Keep hips level and core tight'
      ]),
      muscleGroups: JSON.stringify(['Core', 'Shoulders', 'Glutes']),
      equipment: JSON.stringify(['Bodyweight']),
      difficulty: 'BEGINNER'
    },
    {
      name: 'Burpees',
      description: 'A full-body cardio exercise',
      instructions: JSON.stringify([
        'Start standing, then squat down and place hands on floor',
        'Jump feet back into plank position',
        'Do a push-up, then jump feet back to squat',
        'Jump up with arms overhead'
      ]),
      muscleGroups: JSON.stringify(['Full Body', 'Cardio']),
      equipment: JSON.stringify(['Bodyweight']),
      difficulty: 'ADVANCED'
    },
    {
      name: 'Shoulder Press',
      description: 'An overhead pressing movement for shoulders',
      instructions: JSON.stringify([
        'Stand with feet shoulder-width apart',
        'Hold dumbbells at shoulder level',
        'Press weights overhead until arms are straight',
        'Lower back to starting position'
      ]),
      muscleGroups: JSON.stringify(['Shoulders', 'Triceps', 'Core']),
      equipment: JSON.stringify(['Dumbbells']),
      difficulty: 'INTERMEDIATE'
    },
    {
      name: 'Mountain Climbers',
      description: 'A cardio exercise that targets core and legs',
      instructions: JSON.stringify([
        'Start in plank position',
        'Bring one knee toward chest',
        'Quickly switch legs, bringing other knee forward',
        'Continue alternating at a rapid pace'
      ]),
      muscleGroups: JSON.stringify(['Core', 'Cardio', 'Shoulders']),
      equipment: JSON.stringify(['Bodyweight']),
      difficulty: 'INTERMEDIATE'
    }
  ];

  for (const exercise of exercises) {
    // Check if exercise already exists
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name }
    });
    
    if (!existing) {
      await prisma.exercise.create({
        data: exercise
      });
      console.log(`✅ Created exercise: ${exercise.name}`);
    } else {
      console.log(`⏭️ Exercise already exists: ${exercise.name}`);
    }
  }

  console.log('✅ Exercises seeded successfully');
}

async function main() {
  try {
    await seedExercises();
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();