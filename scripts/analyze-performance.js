const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzePerformance() {
  console.log('🔍 SCALABILITY & PERFORMANCE ANALYSIS');
  console.log('=====================================\n');

  try {
    // 1. Current Database Stats
    console.log('📊 CURRENT DATABASE METRICS:');
    const stats = await Promise.all([
      prisma.user.count(),
      prisma.trainer.count(),
      prisma.foodEntry.count(),
      prisma.progressEntry.count(),
      prisma.workoutSession.count(),
      prisma.appointment.count(),
      prisma.notification.count(),
      prisma.mealPlan.count(),
      prisma.workout.count(),
      prisma.exercise.count()
    ]);

    const [users, trainers, foodEntries, progressEntries, workoutSessions, 
           appointments, notifications, mealPlans, workouts, exercises] = stats;

    console.log(`- Total Users: ${users}`);
    console.log(`- Trainers: ${trainers}`);
    console.log(`- Clients: ${users - trainers}`);
    console.log(`- Food Entries: ${foodEntries}`);
    console.log(`- Progress Entries: ${progressEntries}`);
    console.log(`- Workout Sessions: ${workoutSessions}`);
    console.log(`- Appointments: ${appointments}`);
    console.log(`- Notifications: ${notifications}`);
    console.log(`- Meal Plans: ${mealPlans}`);
    console.log(`- Workouts: ${workouts}`);
    console.log(`- Exercises: ${exercises}`);

    // 2. Calculate per-client data load
    const clients = users - trainers;
    if (clients > 0) {
      console.log(`\n📈 PER-CLIENT AVERAGES:`);
      console.log(`- Food Entries per Client: ${(foodEntries / clients).toFixed(1)}`);
      console.log(`- Progress Entries per Client: ${(progressEntries / clients).toFixed(1)}`);
      console.log(`- Workout Sessions per Client: ${(workoutSessions / clients).toFixed(1)}`);
      console.log(`- Appointments per Client: ${(appointments / clients).toFixed(1)}`);
      console.log(`- Notifications per Client: ${(notifications / clients).toFixed(1)}`);
    }

    // 3. Test query performance
    console.log(`\n⏱️  QUERY PERFORMANCE TESTS:`);
    
    // Test 1: Trainer dashboard query (most complex)
    const start1 = Date.now();
    const trainerData = await prisma.user.findMany({
      where: { role: 'TRAINER' },
      include: {
        clients: {
          include: {
            foodEntries: {
              take: 10,
              orderBy: { createdAt: 'desc' }
            },
            progressEntries: {
              take: 5,
              orderBy: { date: 'desc' }
            },
            workoutSessions: {
              take: 5,
              include: { workout: true }
            }
          }
        }
      }
    });
    const end1 = Date.now();
    console.log(`- Trainer Dashboard Query: ${end1 - start1}ms`);

    // Test 2: Client dashboard query
    const start2 = Date.now();
    const clientData = await prisma.user.findFirst({
      where: { role: 'CLIENT' },
      include: {
        foodEntries: {
          where: {
            date: {
              gte: new Date(new Date().setDate(new Date().getDate() - 7))
            }
          }
        },
        progressEntries: {
          take: 10,
          orderBy: { date: 'desc' }
        },
        workoutSessions: {
          take: 10,
          include: { workout: { include: { exercises: true } } }
        },
        mealPlans: true,
        clientAppointments: {
          take: 10,
          orderBy: { startTime: 'desc' }
        }
      }
    });
    const end2 = Date.now();
    console.log(`- Client Dashboard Query: ${end2 - start2}ms`);

    // Test 3: Food entries query (most frequent)
    const start3 = Date.now();
    const todaysFoodEntries = await prisma.foodEntry.findMany({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        user: { select: { name: true } }
      }
    });
    const end3 = Date.now();
    console.log(`- Today's Food Entries Query: ${end3 - start3}ms (${todaysFoodEntries.length} entries)`);

    // 4. Scalability projections
    console.log(`\n🚀 SCALABILITY PROJECTIONS:`);
    
    const currentClients = clients;
    const avgQueriesPerClient = 20; // Estimated daily API calls per client
    const avgDataPerClient = foodEntries / Math.max(clients, 1);

    console.log(`\nCURRENT LOAD (${currentClients} clients):`);
    console.log(`- Daily API Calls: ~${currentClients * avgQueriesPerClient}`);
    console.log(`- Database Records: ${foodEntries + progressEntries + appointments + notifications}`);

    // Project different client counts
    const projections = [50, 100, 200, 500, 1000];
    
    projections.forEach(clientCount => {
      const dailyApiCalls = clientCount * avgQueriesPerClient;
      const totalRecords = clientCount * avgDataPerClient * 12; // 12 months of data
      const estimatedQueryTime = Math.max(50, totalRecords / 10000); // Rough estimate
      
      console.log(`\nWITH ${clientCount} CLIENTS:`);
      console.log(`- Daily API Calls: ~${dailyApiCalls.toLocaleString()}`);
      console.log(`- Est. Total Records: ~${Math.round(totalRecords).toLocaleString()}`);
      console.log(`- Est. Query Time: ~${Math.round(estimatedQueryTime)}ms`);
      console.log(`- Database Size: ~${Math.round(totalRecords * 0.5 / 1000)}MB`);
      
      if (clientCount <= 100) {
        console.log(`- Performance: ✅ EXCELLENT (SQLite OK)`);
      } else if (clientCount <= 500) {
        console.log(`- Performance: ⚠️  GOOD (Consider PostgreSQL)`);
      } else {
        console.log(`- Performance: 🔄 NEEDS OPTIMIZATION (PostgreSQL + Redis required)`);
      }
    });

  } catch (error) {
    console.error('Analysis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePerformance();