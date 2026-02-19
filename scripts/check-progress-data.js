// Quick database check for progress entries
const { PrismaClient } = require('@prisma/client');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres.zqgaogztrxzsevimqelr:GhYDHFVcjQ41Td4L@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function checkProgressData() {
  try {
    console.log('Checking progress entries...');
    
    // Count total progress entries
    const totalProgress = await prisma.progressEntry.count();
    console.log('Total progress entries in database:', totalProgress);
    
    // Get recent entries
    const recentEntries = await prisma.progressEntry.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log('Recent progress entries:');
    recentEntries.forEach(entry => {
      console.log(`- ${entry.user.name} (${entry.date.toISOString().split('T')[0]}): weight=${entry.weight}, bodyFat=${entry.bodyFat}, mood=${entry.mood}`);
    });
    
    // Check workout progress too
    const totalWorkouts = await prisma.workoutProgress.count();
    console.log('Total workout progress entries:', totalWorkouts);
    
    // Get recent workout entries
    const recentWorkouts = await prisma.workoutProgress.findMany({
      take: 5,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
    
    console.log('Recent workout progress entries:');
    recentWorkouts.forEach(entry => {
      console.log(`- ${entry.user.name} (${entry.date.toISOString().split('T')[0]}):`, JSON.stringify(entry, null, 2));
    });
    
  } catch (error) {
    console.error('Error checking progress data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProgressData();