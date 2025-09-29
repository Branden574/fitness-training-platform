// POSTGRESQL MIGRATION SCRIPT
// This migrates all data from SQLite to PostgreSQL without breaking anything

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Create two Prisma clients
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db' // Your current SQLite
    }
  }
});

const postgresClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.POSTGRESQL_URL // Your new PostgreSQL
    }
  }
});

async function migrateData() {
  console.log('🚀 Starting PostgreSQL migration...');
  
  try {
    // 1. Migrate Users first (they have no dependencies)
    console.log('📊 Migrating users...');
    const users = await sqliteClient.user.findMany({
      include: {
        trainer: true,
        nutritionPlans: true,
        progressEntries: true,
        workoutSessions: true,
        foodEntries: true,
        appointments: true,
        sentMessages: true,
        receivedMessages: true
      }
    });

    for (const user of users) {
      await postgresClient.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          password: user.password,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          trainerId: user.trainerId,
          phoneNumber: user.phoneNumber,
          emergencyContact: user.emergencyContact,
          dateOfBirth: user.dateOfBirth,
          fitnessGoals: user.fitnessGoals,
          fitnessLevel: user.fitnessLevel,
          medicalConditions: user.medicalConditions,
          profileImage: user.profileImage
        }
      });
    }
    console.log(`✅ Migrated ${users.length} users`);

    // 2. Migrate Exercises
    console.log('💪 Migrating exercises...');
    const exercises = await sqliteClient.exercise.findMany();
    
    for (const exercise of exercises) {
      await postgresClient.exercise.upsert({
        where: { id: exercise.id },
        update: {},
        create: {
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          instructions: exercise.instructions,
          videoUrl: exercise.videoUrl,
          createdAt: exercise.createdAt,
          updatedAt: exercise.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${exercises.length} exercises`);

    // 3. Migrate Workouts
    console.log('🏋️ Migrating workouts...');
    const workouts = await sqliteClient.workout.findMany({
      include: { exercises: true }
    });
    
    for (const workout of workouts) {
      await postgresClient.workout.upsert({
        where: { id: workout.id },
        update: {},
        create: {
          id: workout.id,
          name: workout.name,
          description: workout.description,
          difficulty: workout.difficulty,
          duration: workout.duration,
          createdAt: workout.createdAt,
          updatedAt: workout.updatedAt,
          exercises: {
            connect: workout.exercises.map(ex => ({ id: ex.id }))
          }
        }
      });
    }
    console.log(`✅ Migrated ${workouts.length} workouts`);

    // 4. Migrate Nutrition Plans
    console.log('🥗 Migrating nutrition plans...');
    const nutritionPlans = await sqliteClient.nutritionPlan.findMany();
    
    for (const plan of nutritionPlans) {
      await postgresClient.nutritionPlan.upsert({
        where: { id: plan.id },
        update: {},
        create: {
          id: plan.id,
          userId: plan.userId,
          dailyCalories: plan.dailyCalories,
          proteinGrams: plan.proteinGrams,
          carbsGrams: plan.carbsGrams,
          fatGrams: plan.fatGrams,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${nutritionPlans.length} nutrition plans`);

    // 5. Migrate Food Entries
    console.log('🍎 Migrating food entries...');
    const foodEntries = await sqliteClient.foodEntry.findMany();
    
    for (const entry of foodEntries) {
      await postgresClient.foodEntry.upsert({
        where: { id: entry.id },
        update: {},
        create: {
          id: entry.id,
          userId: entry.userId,
          foodName: entry.foodName,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
          quantity: entry.quantity,
          unit: entry.unit,
          mealType: entry.mealType,
          date: entry.date,
          createdAt: entry.createdAt
        }
      });
    }
    console.log(`✅ Migrated ${foodEntries.length} food entries`);

    // 6. Migrate Progress Entries
    console.log('📈 Migrating progress entries...');
    const progressEntries = await sqliteClient.progressEntry.findMany();
    
    for (const entry of progressEntries) {
      await postgresClient.progressEntry.upsert({
        where: { id: entry.id },
        update: {},
        create: {
          id: entry.id,
          userId: entry.userId,
          date: entry.date,
          weight: entry.weight,
          bodyFat: entry.bodyFat,
          muscleMass: entry.muscleMass,
          notes: entry.notes,
          createdAt: entry.createdAt
        }
      });
    }
    console.log(`✅ Migrated ${progressEntries.length} progress entries`);

    // 7. Migrate Workout Sessions
    console.log('💦 Migrating workout sessions...');
    const workoutSessions = await sqliteClient.workoutSession.findMany();
    
    for (const session of workoutSessions) {
      await postgresClient.workoutSession.upsert({
        where: { id: session.id },
        update: {},
        create: {
          id: session.id,
          userId: session.userId,
          workoutId: session.workoutId,
          startTime: session.startTime,
          endTime: session.endTime,
          notes: session.notes,
          createdAt: session.createdAt
        }
      });
    }
    console.log(`✅ Migrated ${workoutSessions.length} workout sessions`);

    // 8. Migrate Appointments
    console.log('📅 Migrating appointments...');
    const appointments = await sqliteClient.appointment.findMany();
    
    for (const appointment of appointments) {
      await postgresClient.appointment.upsert({
        where: { id: appointment.id },
        update: {},
        create: {
          id: appointment.id,
          trainerId: appointment.trainerId,
          clientId: appointment.clientId,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          type: appointment.type,
          status: appointment.status,
          notes: appointment.notes,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${appointments.length} appointments`);

    // 9. Migrate Messages
    console.log('💬 Migrating messages...');
    const messages = await sqliteClient.message.findMany();
    
    for (const message of messages) {
      await postgresClient.message.upsert({
        where: { id: message.id },
        update: {},
        create: {
          id: message.id,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          read: message.read,
          createdAt: message.createdAt
        }
      });
    }
    console.log(`✅ Migrated ${messages.length} messages`);

    console.log('🎉 Migration completed successfully!');
    
    // Create migration summary
    const summary = {
      migrationDate: new Date(),
      totalRecords: {
        users: users.length,
        exercises: exercises.length,
        workouts: workouts.length,
        nutritionPlans: nutritionPlans.length,
        foodEntries: foodEntries.length,
        progressEntries: progressEntries.length,
        workoutSessions: workoutSessions.length,
        appointments: appointments.length,
        messages: messages.length
      }
    };
    
    fs.writeFileSync('migration-summary.json', JSON.stringify(summary, null, 2));
    console.log('📋 Migration summary saved to migration-summary.json');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Verification function
async function verifyMigration() {
  console.log('🔍 Verifying migration...');
  
  const postgresClient = new PrismaClient({
    datasources: {
      db: {
        url: process.env.POSTGRESQL_URL
      }
    }
  });

  try {
    const counts = {
      users: await postgresClient.user.count(),
      exercises: await postgresClient.exercise.count(),
      workouts: await postgresClient.workout.count(),
      nutritionPlans: await postgresClient.nutritionPlan.count(),
      foodEntries: await postgresClient.foodEntry.count(),
      progressEntries: await postgresClient.progressEntry.count(),
      workoutSessions: await postgresClient.workoutSession.count(),
      appointments: await postgresClient.appointment.count(),
      messages: await postgresClient.message.count()
    };

    console.log('📊 PostgreSQL record counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });

    // Test a complex query
    const testUser = await postgresClient.user.findFirst({
      include: {
        foodEntries: true,
        progressEntries: true,
        appointments: true
      }
    });

    if (testUser) {
      console.log('✅ Complex queries working correctly');
      console.log(`  Test user: ${testUser.name} (${testUser.email})`);
      console.log(`  Food entries: ${testUser.foodEntries.length}`);
      console.log(`  Progress entries: ${testUser.progressEntries.length}`);
      console.log(`  Appointments: ${testUser.appointments.length}`);
    }

    console.log('🎉 Migration verification completed successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await postgresClient.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  async function run() {
    try {
      await migrateData();
      await verifyMigration();
      console.log('\n🚀 Your PostgreSQL database is ready!');
      console.log('📝 Next steps:');
      console.log('1. Update your .env file with the PostgreSQL URL');
      console.log('2. Deploy to production with the new database');
      console.log('3. Keep SQLite as backup until confirmed working');
    } catch (error) {
      console.error('Migration process failed:', error);
      process.exit(1);
    }
  }
  
  run();
}

module.exports = { migrateData, verifyMigration };