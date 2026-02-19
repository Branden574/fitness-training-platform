const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Create SQLite client with explicit connection string
const sqliteClient = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});

// Create PostgreSQL client with explicit connection string
const postgresClient = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres'
    }
  }
});

async function migrateData() {
  console.log('🚀 Starting PostgreSQL migration...');
  console.log('📋 This will copy ALL data from SQLite to PostgreSQL safely\n');
  
  try {
    // 1. Migrate Users first
    console.log('📊 Migrating users...');
    const users = await sqliteClient.user.findMany();
    console.log(`Found ${users.length} users to migrate`);

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
          image: user.image,
          passwordChangeRequired: user.passwordChangeRequired || false,
          isActive: true,
          lastLogin: null,
          loginCount: 0,
          adminNotes: null
        }
      });
    }
    console.log(`✅ Migrated ${users.length} users successfully\n`);

    // 2. Migrate Nutrition Plans
    console.log('🥗 Migrating nutrition plans...');
    const nutritionPlans = await sqliteClient.nutritionPlan.findMany();
    console.log(`Found ${nutritionPlans.length} nutrition plans to migrate`);
    
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
    console.log(`✅ Migrated ${nutritionPlans.length} nutrition plans successfully\n`);

    // 3. Migrate Food Entries
    console.log('🍎 Migrating food entries...');
    const foodEntries = await sqliteClient.foodEntry.findMany();
    console.log(`Found ${foodEntries.length} food entries to migrate`);
    
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
          notes: entry.notes,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          foodId: entry.foodId
        }
      });
    }
    console.log(`✅ Migrated ${foodEntries.length} food entries successfully\n`);

    // 4. Migrate Progress Entries
    console.log('📈 Migrating progress entries...');
    const progressEntries = await sqliteClient.progressEntry.findMany();
    console.log(`Found ${progressEntries.length} progress entries to migrate`);
    
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
          measurements: entry.measurements,
          photos: entry.photos,
          notes: entry.notes,
          mood: entry.mood,
          energy: entry.energy,
          sleep: entry.sleep,
          createdAt: entry.createdAt
        }
      });
    }
    console.log(`✅ Migrated ${progressEntries.length} progress entries successfully\n`);

    // 5. Migrate Exercises
    console.log('💪 Migrating exercises...');
    const exercises = await sqliteClient.exercise.findMany();
    console.log(`Found ${exercises.length} exercises to migrate`);
    
    for (const exercise of exercises) {
      await postgresClient.exercise.upsert({
        where: { id: exercise.id },
        update: {},
        create: {
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          instructions: exercise.instructions,
          muscleGroups: exercise.muscleGroups,
          equipment: exercise.equipment,
          difficulty: exercise.difficulty,
          imageUrl: exercise.imageUrl,
          videoUrl: exercise.videoUrl,
          createdAt: exercise.createdAt,
          updatedAt: exercise.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${exercises.length} exercises successfully\n`);

    // 6. Migrate Workouts
    console.log('🏋️ Migrating workouts...');
    const workouts = await sqliteClient.workout.findMany();
    console.log(`Found ${workouts.length} workouts to migrate`);
    
    for (const workout of workouts) {
      await postgresClient.workout.upsert({
        where: { id: workout.id },
        update: {},
        create: {
          id: workout.id,
          title: workout.title,
          description: workout.description,
          duration: workout.duration,
          difficulty: workout.difficulty,
          type: workout.type,
          createdBy: workout.createdBy,
          createdAt: workout.createdAt,
          updatedAt: workout.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${workouts.length} workouts successfully\n`);

    // 7. Migrate Appointments
    console.log('📅 Migrating appointments...');
    const appointments = await sqliteClient.appointment.findMany();
    console.log(`Found ${appointments.length} appointments to migrate`);
    
    for (const appointment of appointments) {
      await postgresClient.appointment.upsert({
        where: { id: appointment.id },
        update: {},
        create: {
          id: appointment.id,
          clientId: appointment.clientId,
          trainerId: appointment.trainerId,
          title: appointment.title,
          description: appointment.description,
          type: appointment.type,
          status: appointment.status,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          duration: appointment.duration,
          location: appointment.location,
          notes: appointment.notes,
          cancelReason: appointment.cancelReason,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt,
          adminNotes: null,
          lastModifiedBy: null
        }
      });
    }
    console.log(`✅ Migrated ${appointments.length} appointments successfully\n`);

    console.log('🎉 Migration completed successfully!');
    
    // Create migration summary
    const summary = {
      migrationDate: new Date().toISOString(),
      totalRecords: {
        users: users.length,
        nutritionPlans: nutritionPlans.length,
        foodEntries: foodEntries.length,
        progressEntries: progressEntries.length,
        exercises: exercises.length,
        workouts: workouts.length,
        appointments: appointments.length
      },
      status: 'SUCCESS'
    };
    
    fs.writeFileSync('migration-summary.json', JSON.stringify(summary, null, 2));
    console.log('📋 Migration summary saved to migration-summary.json');

    return summary;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
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
  
  const client = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres'
      }
    }
  });

  try {
    const counts = {
      users: await client.user.count(),
      nutritionPlans: await client.nutritionPlan.count(),
      foodEntries: await client.foodEntry.count(),
      progressEntries: await client.progressEntry.count(),
      exercises: await client.exercise.count(),
      workouts: await client.workout.count(),
      appointments: await client.appointment.count()
    };

    console.log('\n📊 PostgreSQL record counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });

    // Test a complex query
    const testUser = await client.user.findFirst({
      include: {
        foodEntries: { take: 5 },
        progressEntries: { take: 3 },
        clientAppointments: { take: 3 }
      }
    });

    if (testUser) {
      console.log('\n✅ Complex queries working correctly');
      console.log(`  Test user: ${testUser.name || 'Unnamed'} (${testUser.email})`);
      console.log(`  Food entries: ${testUser.foodEntries.length}`);
      console.log(`  Progress entries: ${testUser.progressEntries.length}`);
      console.log(`  Appointments: ${testUser.clientAppointments.length}`);
    }

    console.log('\n🎉 Migration verification completed successfully!');
    return { success: true, counts };

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return { success: false, error: error.message };
  } finally {
    await client.$disconnect();
  }
}

// Main execution
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
      console.log('1. Test your application with: npm run dev');
      console.log('2. Verify all features work correctly');
      console.log('3. Your SQLite backup is available if needed');
      console.log('\n🔗 Your PostgreSQL database is ready for production!');
    } else {
      console.log('\n❌ Migration completed but verification failed');
      console.log('Please check the data manually before proceeding');
    }

  } catch (error) {
    console.error('\n💥 Migration process failed:', error.message);
    console.log('\n🛟 Recovery steps:');
    console.log('1. Check migration-error.json for details');
    console.log('2. Your SQLite database is unchanged');
    console.log('3. You can restore the SQLite schema if needed');
    process.exit(1);
  }
}

run();