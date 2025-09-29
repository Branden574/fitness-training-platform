const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function productionCleanup() {
  try {
    console.log('🧹 Starting production cleanup...');
    console.log('⚠️  This will remove all test data while preserving Brent\'s account');

    // Get current counts
    const userCount = await prisma.user.count();
    const appointmentCount = await prisma.appointment.count();
    const foodEntryCount = await prisma.foodEntry.count();
    const workoutCount = await prisma.workout.count();
    const exerciseCount = await prisma.exercise.count();
    const nutritionPlanCount = await prisma.nutritionPlan.count();

    console.log('\n📊 Current Database Stats:');
    console.log(`Users: ${userCount}`);
    console.log(`Appointments: ${appointmentCount}`);
    console.log(`Food Entries: ${foodEntryCount}`);
    console.log(`Workouts: ${workoutCount}`);
    console.log(`Exercises: ${exerciseCount}`);
    console.log(`Nutrition Plans: ${nutritionPlanCount}`);

    // Find Brent's account to preserve
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });

    if (!brent) {
      console.log('❌ Brent\'s account not found! Stopping cleanup.');
      return;
    }

    console.log(`\n✅ Found Brent's account: ${brent.name} (${brent.email})`);

    // Start cleanup process
    console.log('\n🗑️  Starting cleanup process...');

    // 1. Delete food entries (no foreign key constraints)
    console.log('1️⃣  Deleting food entries...');
    const deletedFoodEntries = await prisma.foodEntry.deleteMany({});
    console.log(`   ✅ Deleted ${deletedFoodEntries.count} food entries`);

    // 2. Delete nutrition plans
    console.log('2️⃣  Deleting nutrition plans...');
    const deletedNutritionPlans = await prisma.nutritionPlan.deleteMany({});
    console.log(`   ✅ Deleted ${deletedNutritionPlans.count} nutrition plans`);

    // 2.1. Delete meal plans and related data
    console.log('2️⃣.1 Deleting meal plans and related data...');
    await prisma.mealItem.deleteMany({});
    await prisma.meal.deleteMany({});
    const deletedMealPlans = await prisma.mealPlan.deleteMany({});
    console.log(`   ✅ Deleted ${deletedMealPlans.count} meal plans and related items`);

    // 3. Delete workout sessions and related data
    console.log('3️⃣  Deleting workout sessions...');
    await prisma.exerciseProgress.deleteMany({});
    await prisma.workoutProgress.deleteMany({});
    const deletedWorkoutSessions = await prisma.workoutSession.deleteMany({});
    console.log(`   ✅ Deleted ${deletedWorkoutSessions.count} workout sessions and related progress`);

    // 4. Delete workouts and exercises
    console.log('4️⃣  Deleting workouts...');
    await prisma.workoutExercise.deleteMany({});
    const deletedWorkouts = await prisma.workout.deleteMany({});
    console.log(`   ✅ Deleted ${deletedWorkouts.count} workouts`);

    // 5. Delete appointments
    console.log('5️⃣  Deleting appointments...');
    const deletedAppointments = await prisma.appointment.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAppointments.count} appointments`);

    // 6. Reset trainer-client relationships (set trainerId to null for all users except Brent)
    console.log('6️⃣  Resetting trainer-client relationships...');
    const updatedUsers = await prisma.user.updateMany({
      where: {
        NOT: {
          email: 'martinezfitness559@gmail.com'
        }
      },
      data: {
        trainerId: null
      }
    });
    console.log(`   ✅ Reset trainer relationships for ${updatedUsers.count} users`);

    // 7. Delete all other user-related data before deleting users
    console.log('7️⃣  Deleting user-related data...');
    await prisma.progressEntry.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.invitation.deleteMany({});
    await prisma.adminLog.deleteMany({});
    await prisma.clientProfile.deleteMany({
      where: {
        user: {
          NOT: {
            email: 'martinezfitness559@gmail.com'
          }
        }
      }
    });
    await prisma.trainer.deleteMany({
      where: {
        user: {
          NOT: {
            email: 'martinezfitness559@gmail.com'
          }
        }
      }
    });
    console.log(`   ✅ Deleted user-related data`);

    // 8. Delete all users EXCEPT Brent
    console.log('8️⃣  Deleting test users (preserving Brent\'s account)...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        NOT: {
          email: 'martinezfitness559@gmail.com'
        }
      }
    });
    console.log(`   ✅ Deleted ${deletedUsers.count} test users`);

    // 8. Clean up exercises (keep some basic ones for the platform)
    console.log('9️⃣  Cleaning up exercise database...');
    // Keep only essential exercises, delete test/duplicate ones
    const deletedExercises = await prisma.exercise.deleteMany({
      where: {
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { name: { contains: 'sample', mode: 'insensitive' } },
          { name: { contains: 'demo', mode: 'insensitive' } },
          { createdAt: { gte: new Date('2025-09-01') } } // Delete recent test exercises
        ]
      }
    });
    console.log(`   ✅ Deleted ${deletedExercises.count} test exercises`);

    // Get final counts
    const finalUserCount = await prisma.user.count();
    const finalAppointmentCount = await prisma.appointment.count();
    const finalFoodEntryCount = await prisma.foodEntry.count();
    const finalWorkoutCount = await prisma.workout.count();
    const finalExerciseCount = await prisma.exercise.count();
    const finalNutritionPlanCount = await prisma.nutritionPlan.count();

    console.log('\n🎉 Cleanup Complete!');
    console.log('\n📊 Final Database Stats:');
    console.log(`Users: ${finalUserCount} (was ${userCount})`);
    console.log(`Appointments: ${finalAppointmentCount} (was ${appointmentCount})`);
    console.log(`Food Entries: ${finalFoodEntryCount} (was ${foodEntryCount})`);
    console.log(`Workouts: ${finalWorkoutCount} (was ${workoutCount})`);
    console.log(`Exercises: ${finalExerciseCount} (was ${exerciseCount})`);
    console.log(`Nutrition Plans: ${finalNutritionPlanCount} (was ${nutritionPlanCount})`);

    // Verify Brent's account is still there
    const brentCheck = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });

    if (brentCheck) {
      console.log(`\n✅ Brent's account preserved: ${brentCheck.name} (${brentCheck.role})`);
    } else {
      console.log('\n❌ ERROR: Brent\'s account was accidentally deleted!');
    }

    console.log('\n🚀 Database is now ready for production demo with Brent!');
    console.log('📝 Next steps:');
    console.log('   - Platform is clean and ready to show');
    console.log('   - Brent can sign in and start adding real clients');
    console.log('   - All test data has been removed');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

productionCleanup();