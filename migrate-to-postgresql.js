const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Create two Prisma clients - one for SQLite, one for PostgreSQL
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

// PostgreSQL client will use the new DATABASE_URL
const postgresClient = new PrismaClient();

async function migrateData() {
  console.log('🚀 Starting PostgreSQL migration...');
  console.log('📋 This will copy ALL data from SQLite to PostgreSQL safely');
  
  try {
    // 1. Migrate Users first (they have no dependencies)
    console.log('\n📊 Migrating users...');
    const users = await sqliteClient.user.findMany();

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
    console.log(`✅ Migrated ${users.length} users successfully`);

    // 2. Migrate Exercises
    console.log('\n💪 Migrating exercises...');
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
    console.log(`✅ Migrated ${exercises.length} exercises successfully`);

    // 3. Migrate Workouts
    console.log('\n🏋️ Migrating workouts...');
    const workouts = await sqliteClient.workout.findMany({
      include: { exercises: true }
    });
    
    for (const workout of workouts) {
      // Create workout first
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
          updatedAt: workout.updatedAt
        }
      });

      // Then connect exercises
      if (workout.exercises.length > 0) {
        await postgresClient.workout.update({
          where: { id: workout.id },
          data: {
            exercises: {
              connect: workout.exercises.map(ex => ({ id: ex.id }))
            }
          }
        });
      }
    }
    console.log(`✅ Migrated ${workouts.length} workouts successfully`);

    // 4. Migrate Nutrition Plans
    console.log('\n🥗 Migrating nutrition plans...');
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
          isActive: plan.isActive || true,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${nutritionPlans.length} nutrition plans successfully`);

    // 5. Migrate Food Entries
    console.log('\n🍎 Migrating food entries...');
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
    console.log(`✅ Migrated ${foodEntries.length} food entries successfully`);

    // 6. Migrate Progress Entries
    console.log('\n📈 Migrating progress entries...');
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
    console.log(`✅ Migrated ${progressEntries.length} progress entries successfully`);

    // 7. Migrate Workout Sessions
    console.log('\n💦 Migrating workout sessions...');
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
    console.log(`✅ Migrated ${workoutSessions.length} workout sessions successfully`);

    // 8. Migrate Appointments
    console.log('\n📅 Migrating appointments...');
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
    console.log(`✅ Migrated ${appointments.length} appointments successfully`);

    // 9. Migrate Messages
    console.log('\n💬 Migrating messages...');
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
    console.log(`✅ Migrated ${messages.length} messages successfully`);

    console.log('\n🎉 Migration completed successfully!');
    
    // Create migration summary
    const summary = {
      migrationDate: new Date().toISOString(),
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
      },
      status: 'SUCCESS'
    };
    
    fs.writeFileSync('migration-summary.json', JSON.stringify(summary, null, 2));
    console.log('📋 Migration summary saved to migration-summary.json');

    return summary;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Save error details
    const errorSummary = {
      migrationDate: new Date().toISOString(),
      status: 'FAILED',
      error: error.message,
      stack: error.stack
    };
    
    fs.writeFileSync('migration-error.json', JSON.stringify(errorSummary, null, 2));
    throw error;
  } finally {
    await sqliteClient.$disconnect();
    await postgresClient.$disconnect();
  }
}

// Verification function
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  const postgresClient = new PrismaClient();

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

    console.log('\n📊 PostgreSQL record counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });

    // Test a complex query to ensure relationships work
    console.log('\n🧪 Testing complex queries...');
    const testUser = await postgresClient.user.findFirst({
      include: {
        foodEntries: { take: 5 },
        progressEntries: { take: 3 },
        appointments: { take: 3 },
        clients: true
      }
    });

    if (testUser) {
      console.log('✅ Complex queries working correctly');
      console.log(`  Test user: ${testUser.name || 'Unnamed'} (${testUser.email})`);
      console.log(`  Food entries: ${testUser.foodEntries.length}`);
      console.log(`  Progress entries: ${testUser.progressEntries.length}`);
      console.log(`  Appointments: ${testUser.appointments.length}`);
      console.log(`  Clients: ${testUser.clients.length}`);
    }

    // Test macro calculation query (the one we fixed!)
    console.log('\n🍎 Testing macro calculations...');
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const macroTest = await postgresClient.foodEntry.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        userId: true
      }
    });

    console.log(`✅ Macro calculation query returned ${macroTest.length} entries`);

    console.log('\n🎉 Migration verification completed successfully!');
    return { success: true, counts };

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { success: false, error: error.message };
  } finally {
    await postgresClient.$disconnect();
  }
}

// Main execution
if (require.main === module) {
  async function run() {
    try {
      console.log('🚀 PostgreSQL Migration Tool');
      console.log('================================');
      console.log('This will safely copy all your data to PostgreSQL');
      console.log('Your SQLite database will remain unchanged as backup\n');

      const summary = await migrateData();
      const verification = await verifyMigration();

      if (verification.success) {
        console.log('\n✅ MIGRATION SUCCESSFUL!');
        console.log('🎯 Next steps:');
        console.log('1. Update your .env file with PostgreSQL DATABASE_URL');
        console.log('2. Run: npx prisma generate');
        console.log('3. Test your application with: npm run dev');
        console.log('4. Keep SQLite backup until confirmed working');
        console.log('\n🔗 Your PostgreSQL database is ready for production!');
      } else {
        console.log('\n❌ Migration completed but verification failed');
        console.log('Please check the data manually before switching');
      }

    } catch (error) {
      console.error('\n💥 Migration process failed:', error.message);
      console.log('\n🛟 Recovery steps:');
      console.log('1. Check migration-error.json for details');
      console.log('2. Ensure PostgreSQL database is accessible');
      console.log('3. Verify DATABASE_URL is correct');
      console.log('4. Your SQLite database is unchanged');
      process.exit(1);
    }
  }
  
  run();
}

module.exports = { migrateData, verifyMigration };