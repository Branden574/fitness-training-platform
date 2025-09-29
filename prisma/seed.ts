import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create demo trainer
  const trainer = await prisma.user.create({
    data: {
      name: 'Brent Martinez',
      email: 'trainer@demo.com',
      role: 'TRAINER',
    },
  });

  await prisma.trainer.create({
    data: {
      userId: trainer.id,
      bio: 'Certified personal trainer with 8+ years of experience specializing in strength training, weight loss, and nutrition coaching. Helping clients transform their lives through sustainable fitness and nutrition habits.',
      experience: 8,
      specializations: JSON.stringify(['Strength Training', 'Weight Loss', 'Nutrition Coaching', 'Muscle Building', 'Body Transformation']),
      certifications: JSON.stringify(['NASM-CPT', 'Precision Nutrition Level 1', 'CSCS']),
    },
  });

  // Create demo client
  const client = await prisma.user.create({
    data: {
      name: 'John Doe',
      email: 'client@demo.com',
      role: 'CLIENT',
      trainerId: trainer.id,
    },
  });

  await prisma.clientProfile.create({
    data: {
      userId: client.id,
      age: 28,
      height: 175, // cm
      weight: 80, // kg
      fitnessLevel: 'INTERMEDIATE',
      fitnessGoals: JSON.stringify(['Weight Loss', 'Muscle Building', 'Improved Endurance']),
      medicalConditions: JSON.stringify([]),
      preferences: JSON.stringify(['Morning Workouts', 'Home Workouts']),
    },
  });

  // Create some sample exercises
  const exercises = await Promise.all([
    prisma.exercise.create({
      data: {
        name: 'Push-ups',
        description: 'Classic bodyweight exercise for chest, shoulders, and triceps',
        instructions: JSON.stringify([
          'Start in plank position',
          'Lower body until chest nearly touches floor',
          'Push back up to starting position'
        ]),
        muscleGroups: JSON.stringify(['Chest', 'Shoulders', 'Triceps']),
        equipment: JSON.stringify(['None']),
        difficulty: 'BEGINNER',
      },
    }),
    prisma.exercise.create({
      data: {
        name: 'Squats',
        description: 'Fundamental lower body exercise',
        instructions: JSON.stringify([
          'Stand with feet shoulder-width apart',
          'Lower down as if sitting in a chair',
          'Push through heels to return to standing'
        ]),
        muscleGroups: JSON.stringify(['Quadriceps', 'Glutes', 'Hamstrings']),
        equipment: JSON.stringify(['None']),
        difficulty: 'BEGINNER',
      },
    }),
    prisma.exercise.create({
      data: {
        name: 'Deadlifts',
        description: 'Compound exercise for posterior chain',
        instructions: JSON.stringify([
          'Stand with barbell over mid-foot',
          'Bend at hips and knees to grab bar',
          'Stand up straight, pushing through heels'
        ]),
        muscleGroups: JSON.stringify(['Hamstrings', 'Glutes', 'Lower Back']),
        equipment: JSON.stringify(['Barbell', 'Weight Plates']),
        difficulty: 'INTERMEDIATE',
      },
    }),
  ]);

  // Create a sample workout
  const workout = await prisma.workout.create({
    data: {
      title: 'Full Body Beginner Workout',
      description: 'A comprehensive full-body workout perfect for beginners',
      duration: 45,
      difficulty: 'BEGINNER',
      type: 'STRENGTH',
      createdBy: trainer.id,
    },
  });

  // Add exercises to the workout
  await Promise.all(exercises.map((exercise, index) => 
    prisma.workoutExercise.create({
      data: {
        workoutId: workout.id,
        exerciseId: exercise.id,
        sets: 3,
        reps: index === 0 ? 10 : index === 1 ? 15 : 8, // Different reps for variety
        restTime: 60,
        order: index + 1,
      },
    })
  ));

  // Create some sample foods
  const foods = await Promise.all([
    prisma.food.create({
      data: {
        name: 'Chicken Breast',
        brand: 'Generic',
        caloriesPerServing: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
        servingSize: '100',
        servingUnit: 'grams',
      },
    }),
    prisma.food.create({
      data: {
        name: 'Brown Rice',
        brand: 'Generic',
        caloriesPerServing: 111,
        protein: 2.6,
        carbs: 23,
        fat: 0.9,
        fiber: 1.8,
        servingSize: '100',
        servingUnit: 'grams',
      },
    }),
    prisma.food.create({
      data: {
        name: 'Broccoli',
        brand: 'Generic',
        caloriesPerServing: 34,
        protein: 2.8,
        carbs: 7,
        fat: 0.4,
        fiber: 2.6,
        servingSize: '100',
        servingUnit: 'grams',
      },
    }),
  ]);

  // Create a sample meal plan
  const mealPlan = await prisma.mealPlan.create({
    data: {
      name: 'Healthy Weight Loss Plan',
      description: 'Balanced meal plan for sustainable weight loss',
      userId: client.id,
      trainerId: trainer.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      dailyCalorieTarget: 1800,
      dailyProteinTarget: 120,
      dailyCarbTarget: 180,
      dailyFatTarget: 60,
    },
  });

  // Create a sample meal
  const meal = await prisma.meal.create({
    data: {
      name: 'Healthy Lunch',
      type: 'LUNCH',
      mealPlanId: mealPlan.id,
    },
  });

  // Add foods to the meal
  await Promise.all(foods.map((food, index) => 
    prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodId: food.id,
        quantity: index === 0 ? 150 : index === 1 ? 80 : 100, // Different quantities
      },
    })
  ));

  // Create some progress entries
  await Promise.all([
    prisma.progressEntry.create({
      data: {
        userId: client.id,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        weight: 82,
        bodyFat: 18,
        mood: 7,
        energy: 6,
        sleep: 7.5,
        notes: 'Feeling good, energy levels improving',
      },
    }),
    prisma.progressEntry.create({
      data: {
        userId: client.id,
        date: new Date(),
        weight: 80,
        bodyFat: 17,
        mood: 8,
        energy: 8,
        sleep: 8,
        notes: 'Great progress this week!',
      },
    }),
  ]);

  console.log('Database seeded successfully with Brent Martinez Fitness data!');
  console.log('Demo credentials:');
  console.log('Trainer: trainer@demo.com (password: demo123) - Brent Martinez');
  console.log('Client: client@demo.com (password: demo123)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });