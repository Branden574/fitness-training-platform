const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:iE27%26%2BnQ7VdHp8%23@db.zqgaogztrxzsevimqelr.supabase.co:5432/postgres"
    }
  }
});

async function exploreDatabase() {
  try {
    console.log('🔍 EXPLORING YOUR LIVE DATABASE\n');

    console.log('🌐 DATABASE ACCESS INFORMATION:');
    console.log('   Dashboard: https://supabase.com/dashboard');
    console.log('   Host: db.zqgaogztrxzsevimqelr.supabase.co');
    console.log('   Database: postgres');
    console.log('   Status: ✅ Live cloud database\n');

    // Get all tables and their counts
    console.log('📊 CURRENT DATA IN YOUR DATABASE:\n');

    const tables = [
      { name: 'Users', query: () => prisma.user.count() },
      { name: 'Exercises', query: () => prisma.exercise.count() },
      { name: 'Workouts', query: () => prisma.workout.count() },
      { name: 'Appointments', query: () => prisma.appointment.count() },
      { name: 'Food Entries', query: () => prisma.foodEntry.count() },
      { name: 'Nutrition Plans', query: () => prisma.nutritionPlan.count() },
      { name: 'Messages', query: () => prisma.message.count() },
      { name: 'Notifications', query: () => prisma.notification.count() }
    ];

    for (const table of tables) {
      try {
        const count = await table.query();
        console.log(`   ${table.name}: ${count}`);
      } catch (error) {
        console.log(`   ${table.name}: ❌ Error accessing`);
      }
    }

    console.log('\n👤 USER ACCOUNTS:\n');
    
    try {
      const users = await prisma.user.findMany({
        select: {
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || 'No name'}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`      Created: ${user.createdAt.toLocaleDateString()}\n`);
      });
    } catch (error) {
      console.log('   ❌ Error accessing users table');
    }

    console.log('💪 AVAILABLE EXERCISES:\n');
    
    try {
      const exercises = await prisma.exercise.findMany({
        select: {
          name: true,
          difficulty: true,
          muscleGroups: true
        },
        orderBy: { name: 'asc' }
      });

      exercises.forEach((exercise, index) => {
        console.log(`   ${index + 1}. ${exercise.name} (${exercise.difficulty})`);
        if (exercise.muscleGroups) {
          console.log(`      Targets: ${exercise.muscleGroups.join(', ')}`);
        }
        console.log('');
      });
    } catch (error) {
      console.log('   ❌ Error accessing exercises table');
    }

    console.log('🌐 ACCESS OPTIONS:\n');
    console.log('   1️⃣  Supabase Dashboard (Easiest):');
    console.log('      → Go to https://supabase.com/dashboard');
    console.log('      → Sign in and find your project\n');
    
    console.log('   2️⃣  Database Client (Advanced):');
    console.log('      → Download DBeaver, pgAdmin, or TablePlus');
    console.log('      → Use connection details from DATABASE-ACCESS-GUIDE.md\n');
    
    console.log('   3️⃣  Continue with Scripts (Current method):');
    console.log('      → Keep using Node.js scripts like this one');
    console.log('      → Great for automation and data management\n');

    console.log('🎯 RECOMMENDATION:');
    console.log('   Start with the Supabase Dashboard for visual database management!');
    console.log('   It\'s the easiest way to see all your data and make changes.');

  } catch (error) {
    console.error('❌ Connection Error:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('   1. Check your internet connection');
    console.log('   2. Verify Supabase service status');
    console.log('   3. Try again in a few moments');
    console.log('\n💡 Even if connection fails, your database is still live!');
    console.log('   The error might be temporary network issues.');
  } finally {
    await prisma.$disconnect();
  }
}

exploreDatabase();