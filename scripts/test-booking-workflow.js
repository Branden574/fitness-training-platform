const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testClientBooking() {
  try {
    // Get the client and trainer
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

    console.log('🧪 Testing client booking workflow...');
    console.log('👤 Client:', client.name);
    console.log('👨‍🏫 Trainer:', trainer.name);
    console.log('');

    // Simulate a client booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2:00 PM tomorrow

    const endTime = new Date(tomorrow);
    endTime.setHours(15, 0, 0, 0); // 3:00 PM tomorrow

    const newBooking = await prisma.appointment.create({
      data: {
        clientId: client.id,
        trainerId: trainer.id,
        title: 'Upper Body Strength Training',
        description: 'Focus on bench press, rows, and shoulder exercises. I want to improve my upper body strength for better posture.',
        type: 'TRAINING_SESSION',
        status: 'PENDING',
        startTime: tomorrow,
        endTime: endTime,
        duration: 60,
        location: 'Weight Room',
        notes: 'I have been experiencing some shoulder discomfort, please keep that in mind'
      },
      include: {
        client: {
          select: { name: true, email: true }
        },
        trainer: {
          select: { name: true, email: true }
        }
      }
    });

    console.log('📅 ✅ CLIENT BOOKING CREATED:');
    console.log(`   Title: ${newBooking.title}`);
    console.log(`   Type: ${newBooking.type}`);
    console.log(`   Status: ${newBooking.status} (awaiting trainer approval)`);
    console.log(`   Time: ${newBooking.startTime.toLocaleDateString()} at ${newBooking.startTime.toLocaleTimeString()}`);
    console.log(`   Duration: ${newBooking.duration} minutes`);
    console.log(`   Location: ${newBooking.location}`);
    console.log('');

    // Check pending appointments for trainer
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        trainerId: trainer.id,
        status: 'PENDING'
      },
      include: {
        client: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('📋 TRAINER PENDING APPROVALS:');
    pendingAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. ${apt.title} - ${apt.client.name}`);
      console.log(`      ${new Date(apt.startTime).toLocaleDateString()} at ${new Date(apt.startTime).toLocaleTimeString()}`);
      console.log(`      Status: ${apt.status}`);
    });
    console.log('');

    console.log('🎯 NEXT STEPS:');
    console.log('1. Login as trainer and go to Schedule tab');
    console.log('2. See the new booking in "Pending Approvals"');
    console.log('3. Click approve/reject buttons to test workflow');
    console.log('4. Login as client to see status updates');
    console.log('');
    console.log('🔄 REAL-TIME FEATURES:');
    console.log('- Schedule tabs auto-refresh every 30 seconds');
    console.log('- Approval actions immediately update UI');
    console.log('- Conflict detection prevents double-booking');

  } catch (error) {
    console.error('❌ Error testing booking workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientBooking();