/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedWorkouts() {
  try {
    // Find the client and trainer users
    const client = await prisma.user.findUnique({
      where: { email: 'client@example.com' }
    });
    
    const trainer = await prisma.user.findUnique({
      where: { email: 'trainer@example.com' }
    });

    if (!client || !trainer) {
      console.log('Client or trainer not found');
      return;
    }

    // Create some exercises
    const exerciseData = [
      {
        name: 'Push-ups',
        description: 'Classic bodyweight exercise for chest, shoulders, and triceps',
        instructions: JSON.stringify([
          'Start in plank position',
          'Lower body until chest nearly touches floor',
          'Push back up to starting position'
        ]),
        muscleGroups: JSON.stringify(['Chest', 'Shoulders', 'Triceps']),
        equipment: JSON.stringify(['Bodyweight']),
        difficulty: 'BEGINNER'
      },
      {
        name: 'Squats',
        description: 'Fundamental lower body exercise',
        instructions: JSON.stringify([
          'Stand with feet shoulder-width apart',
          'Lower hips back and down',
          'Keep chest up and knees tracking over toes',
          'Return to standing'
        ]),
        muscleGroups: JSON.stringify(['Quadriceps', 'Glutes', 'Hamstrings']),
        equipment: JSON.stringify(['Bodyweight']),
        difficulty: 'BEGINNER'
      },
      {
        name: 'Plank',
        description: 'Core strengthening exercise',
        instructions: JSON.stringify([
          'Start in push-up position',
          'Hold position with straight line from head to heels',
          'Engage core and breathe normally'
        ]),
        muscleGroups: JSON.stringify(['Core', 'Shoulders']),
        equipment: JSON.stringify(['Bodyweight']),
        difficulty: 'BEGINNER'
      }
    ];

    const exercises = [];
    for (const exerciseInfo of exerciseData) {
      let exercise = await prisma.exercise.findFirst({
        where: { name: exerciseInfo.name }
      });
      
      if (!exercise) {
        exercise = await prisma.exercise.create({
          data: exerciseInfo
        });
      }
      exercises.push(exercise);
    }

    console.log('Created exercises:', exercises.map(e => e.name));

    // Create a sample workout
    let workout = await prisma.workout.findFirst({
      where: { title: 'Beginner Full Body Workout' }
    });
    
    if (!workout) {
      workout = await prisma.workout.create({
        data: {
          title: 'Beginner Full Body Workout',
          description: 'A great workout for beginners to build strength',
          duration: 30,
          difficulty: 'BEGINNER',
          type: 'STRENGTH',
          createdBy: trainer.id
        }
      });
    }

    console.log('Created workout:', workout.title);

    // Add exercises to the workout
    await Promise.all([
      prisma.workoutExercise.upsert({
        where: { 
          workoutId_exerciseId: {
            workoutId: workout.id,
            exerciseId: exercises[0].id
          }
        },
        update: {},
        create: {
          workoutId: workout.id,
          exerciseId: exercises[0].id,
          sets: 3,
          reps: 10,
          order: 1,
          restTime: 60
        }
      }),
      prisma.workoutExercise.upsert({
        where: { 
          workoutId_exerciseId: {
            workoutId: workout.id,
            exerciseId: exercises[1].id
          }
        },
        update: {},
        create: {
          workoutId: workout.id,
          exerciseId: exercises[1].id,
          sets: 3,
          reps: 15,
          order: 2,
          restTime: 60
        }
      }),
      prisma.workoutExercise.upsert({
        where: { 
          workoutId_exerciseId: {
            workoutId: workout.id,
            exerciseId: exercises[2].id
          }
        },
        update: {},
        create: {
          workoutId: workout.id,
          exerciseId: exercises[2].id,
          sets: 3,
          duration: 30,
          order: 3,
          restTime: 30
        }
      })
    ]);

    // Assign the workout to the client
    await prisma.workoutSession.upsert({
      where: {
        workoutId_userId: {
          workoutId: workout.id,
          userId: client.id
        }
      },
      update: {},
      create: {
        workoutId: workout.id,
        userId: client.id,
        startTime: new Date()
      }
    });

    // Create some progress entries for the client
    const today = new Date();
    await Promise.all([
      prisma.progressEntry.upsert({
        where: {
          userId_date: {
            userId: client.id,
            date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        },
        update: {},
        create: {
          userId: client.id,
          date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          weight: 180,
          bodyFat: 18,
          mood: 7,
          energy: 6,
          sleep: 7.5,
          notes: 'Feeling good, ready to start training!'
        }
      }),
      prisma.progressEntry.upsert({
        where: {
          userId_date: {
            userId: client.id,
            date: today
          }
        },
        update: {},
        create: {
          userId: client.id,
          date: today,
          weight: 178,
          bodyFat: 17.5,
          mood: 8,
          energy: 8,
          sleep: 8,
          notes: 'Great progress this week!'
        }
      })
    ]);

    console.log('✅ Workout data seeded successfully!');

  } catch (error) {
    console.error('Error seeding workouts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedWorkouts();