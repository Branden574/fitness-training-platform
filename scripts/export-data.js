const { PrismaClient } = require('@prisma/client');

// SQLite client (current data)
const prisma = new PrismaClient();

async function exportData() {
  console.log('📊 Exporting data from SQLite...');
  
  try {
    const data = {
      users: await prisma.user.findMany(),
      mealPlans: await prisma.mealPlan.findMany(),
      foodEntries: await prisma.foodEntry.findMany(),
      progressEntries: await prisma.progressEntry.findMany(),
      exercises: await prisma.exercise.findMany(),
      workouts: await prisma.workout.findMany(),
      appointments: await prisma.appointment.findMany(),
      messages: await prisma.message.findMany(),
      notifications: await prisma.notification.findMany(),
      contactSubmissions: await prisma.contactSubmission.findMany(),
      invitations: await prisma.invitation.findMany()
    };

    console.log('📋 Data export summary:');
    Object.entries(data).forEach(([table, records]) => {
      console.log(`  ${table}: ${records.length} records`);
    });

    // Save to file
    const fs = require('fs');
    fs.writeFileSync('exported-data.json', JSON.stringify(data, null, 2));
    console.log('\n✅ Data exported to exported-data.json');
    
    return data;

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData();