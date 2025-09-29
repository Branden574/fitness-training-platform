const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function verifyAdminDashboard() {
  try {
    console.log('🔍 Verifying Admin Dashboard Setup...\n');

    // Check admin user exists
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    console.log('👤 Admin User:', adminUser ? '✅ Found' : '❌ Missing');
    if (adminUser) {
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Email: ${adminUser.email}`);
    }

    // Get platform statistics
    const [
      totalUsers,
      totalClients,
      totalTrainers,
      totalAppointments,
      totalFoodEntries,
      totalWorkouts,
      totalProgressEntries
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'TRAINER' } }),
      prisma.appointment.count(),
      prisma.foodEntry.count(),
      prisma.workout.count(),
      prisma.progressEntry.count()
    ]);

    console.log('\n📊 Platform Statistics:');
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Clients: ${totalClients}`);
    console.log(`   Trainers: ${totalTrainers}`);
    console.log(`   Appointments: ${totalAppointments}`);
    console.log(`   Food Entries: ${totalFoodEntries}`);
    console.log(`   Workouts: ${totalWorkouts}`);
    console.log(`   Progress Entries: ${totalProgressEntries}`);

    // Test user activity data
    const usersWithActivity = await prisma.user.findMany({
      take: 5,
      include: {
        _count: {
          select: {
            foodEntries: true,
            clientAppointments: true,
            progressEntries: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n👥 Recent Users with Activity:');
    usersWithActivity.forEach(user => {
      console.log(`   ${user.name || 'No name'} (${user.email})`);
      console.log(`     Role: ${user.role}`);
      console.log(`     Food Entries: ${user._count.foodEntries}`);
      console.log(`     Appointments: ${user._count.clientAppointments}`);
      console.log(`     Progress: ${user._count.progressEntries}`);
      console.log(`     Created: ${user.createdAt.toLocaleDateString()}`);
      console.log('');
    });

    // Test database connection and performance
    const startTime = Date.now();
    await prisma.user.findFirst();
    const queryTime = Date.now() - startTime;

    console.log('🚀 Performance:');
    console.log(`   Database Query Time: ${queryTime}ms`);
    console.log(`   Connection: ${queryTime < 1000 ? '✅ Fast' : '⚠️ Slow'}`);

    // Check for PostgreSQL-specific features
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('\n🗄️ Database Info:');
    console.log(`   ${result[0].version.includes('PostgreSQL') ? '✅' : '❌'} PostgreSQL Confirmed`);
    console.log(`   Version: ${result[0].version.split(' ')[1]}`);

    console.log('\n✅ Admin Dashboard Verification Complete!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Visit http://localhost:3000/admin to access the dashboard');
    console.log('2. Log in with admin credentials');
    console.log('3. Test user management features');
    console.log('4. Monitor platform statistics in real-time');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdminDashboard();