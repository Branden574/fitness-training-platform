const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Starting comprehensive feature testing...\n');

  try {
    // 1. Test Database Connectivity
    console.log('📊 Testing Database Connectivity...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected - ${userCount} users found\n`);

    // 2. Test User Authentication Data
    console.log('🔐 Testing Authentication System...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordChangeRequired: true,
        password: true
      }
    });

    let authTestsPassed = 0;
    let authTestsTotal = 0;

    for (const user of users) {
      authTestsTotal++;
      if (user.password && user.password.length > 20) {
        authTestsPassed++;
        console.log(`✅ ${user.email} - Password hash valid (${user.role})`);
      } else {
        console.log(`❌ ${user.email} - Password hash invalid or missing`);
      }
    }
    console.log(`Authentication Tests: ${authTestsPassed}/${authTestsTotal} passed\n`);

    // 3. Test Data Relationships
    console.log('🔗 Testing Data Relationships...');
    
    // Test trainer-client relationships
    const trainers = await prisma.user.findMany({
      where: { role: 'TRAINER' },
      include: {
        clients: true,
        trainer: true
      }
    });

    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: {
        assignedTrainer: true
      }
    });

    console.log(`✅ Found ${trainers.length} trainers`);
    trainers.forEach(trainer => {
      console.log(`  - ${trainer.name}: ${trainer.clients.length} clients assigned`);
    });

    console.log(`✅ Found ${clients.length} clients`);
    let assignedClients = 0;
    clients.forEach(client => {
      if (client.assignedTrainer) {
        assignedClients++;
        console.log(`  - ${client.name}: assigned to ${client.assignedTrainer.name}`);
      } else {
        console.log(`  - ${client.name}: ⚠️  no trainer assigned`);
      }
    });
    console.log(`Relationship Tests: ${assignedClients}/${clients.length} clients have trainers\n`);

    // 4. Test Food Entries
    console.log('🍎 Testing Food Entries...');
    const foodEntries = await prisma.foodEntry.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${foodEntries.length} recent food entries`);
    foodEntries.forEach(entry => {
      console.log(`  - ${entry.user.name}: ${entry.foodName} (${entry.calories} cal, ${entry.protein}g protein)`);
    });

    // 5. Test Progress Entries
    console.log('\n📈 Testing Progress Entries...');
    const progressEntries = await prisma.progressEntry.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${progressEntries.length} recent progress entries`);
    progressEntries.forEach(entry => {
      console.log(`  - ${entry.user.name}: ${entry.weight ? entry.weight + ' lbs' : 'No weight'}, Mood: ${entry.mood || 'N/A'}/10`);
    });

    // 6. Test Workouts
    console.log('\n💪 Testing Workouts...');
    const workouts = await prisma.workout.findMany({
      include: {
        exercises: true,
        creator: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`✅ Found ${workouts.length} workouts`);
    workouts.forEach(workout => {
      console.log(`  - ${workout.title}: ${workout.exercises.length} exercises (by ${workout.creator.name})`);
    });

    // 7. Test Workout Sessions
    console.log('\n🏋️ Testing Workout Sessions...');
    const workoutSessions = await prisma.workoutSession.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
        workout: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${workoutSessions.length} workout sessions`);
    workoutSessions.forEach(session => {
      console.log(`  - ${session.user.name}: ${session.workout?.title || 'Unknown workout'} (${session.completed ? 'Completed' : 'Pending'})`);
    });

    // 8. Test Nutrition Plans
    console.log('\n🥗 Testing Nutrition Plans...');
    const nutritionPlans = await prisma.mealPlan.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        },
        trainer: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`✅ Found ${nutritionPlans.length} nutrition plans`);
    nutritionPlans.forEach(plan => {
      console.log(`  - ${plan.name}: for ${plan.user.name} by ${plan.trainer.name} (${plan.dailyCalorieTarget} cal target)`);
    });

    // 9. Test Appointments
    console.log('\n📅 Testing Appointments...');
    const appointments = await prisma.appointment.findMany({
      include: {
        client: {
          select: {
            name: true
          }
        },
        trainer: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${appointments.length} recent appointments`);
    appointments.forEach(appointment => {
      const date = new Date(appointment.startTime).toLocaleDateString();
      console.log(`  - ${appointment.client.name} with ${appointment.trainer.name}: ${date} (${appointment.status})`);
    });

    // 10. Test Notifications
    console.log('\n🔔 Testing Notifications...');
    const notifications = await prisma.notification.findMany({
      include: {
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`✅ Found ${notifications.length} recent notifications`);
    notifications.forEach(notification => {
      console.log(`  - ${notification.user.name}: ${notification.title} (${notification.read ? 'Read' : 'Unread'})`);
    });

    console.log('\n🎉 Database tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();