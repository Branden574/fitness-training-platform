const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestAppointments() {
  try {
    // First, get the trainer and client IDs
    const trainer = await prisma.user.findFirst({
      where: { role: 'TRAINER' }
    });
    
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });

    if (!trainer || !client) {
      console.log('❌ Need both trainer and client users in database');
      return;
    }

    console.log('👨‍🏫 Trainer:', trainer.name, '(', trainer.id, ')');
    console.log('👤 Client:', client.name, '(', client.id, ')');

    // Create test appointments for the next week
    const appointments = [
      {
        clientId: client.id,
        trainerId: trainer.id,
        title: 'Personal Training Session',
        description: 'Full body strength training with focus on squats and deadlifts',
        type: 'TRAINING_SESSION',
        status: 'PENDING',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
        duration: 60,
        location: 'Main Gym Floor',
        notes: 'Bring water bottle and towel'
      },
      {
        clientId: client.id,
        trainerId: trainer.id,
        title: 'Progress Check-in',
        description: 'Monthly progress review and goal adjustment',
        type: 'CHECK_IN',
        status: 'PENDING',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // +30 minutes
        duration: 30,
        location: 'Office',
        notes: 'Review progress photos and measurements'
      },
      {
        clientId: client.id,
        trainerId: trainer.id,
        title: 'Nutrition Consultation',
        description: 'Meal plan review and dietary guidance',
        type: 'NUTRITION_CONSULTATION',
        status: 'PENDING',
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // +45 minutes
        duration: 45,
        location: 'Consultation Room',
        notes: 'Bring current meal diary'
      },
      {
        clientId: client.id,
        trainerId: trainer.id,
        title: 'HIIT Cardio Session',
        description: 'High intensity interval training with circuit exercises',
        type: 'TRAINING_SESSION',
        status: 'APPROVED', // This one is already approved
        startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // In 4 days
        endTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // +45 minutes
        duration: 45,
        location: 'Cardio Area',
        notes: 'Focus on metabolic conditioning'
      }
    ];

    // Create the appointments
    for (const appointment of appointments) {
      const created = await prisma.appointment.create({
        data: appointment,
        include: {
          client: {
            select: { name: true, email: true }
          },
          trainer: {
            select: { name: true, email: true }
          }
        }
      });

      console.log(`✅ Created appointment: ${created.title} (${created.status})`);
      console.log(`   📅 ${new Date(created.startTime).toLocaleDateString()} at ${new Date(created.startTime).toLocaleTimeString()}`);
      console.log(`   👤 Client: ${created.client.name}`);
      console.log(`   ⏱️ Duration: ${created.duration} minutes`);
      console.log('');
    }

    console.log('🎉 All test appointments created successfully!');

  } catch (error) {
    console.error('❌ Error creating test appointments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAppointments();