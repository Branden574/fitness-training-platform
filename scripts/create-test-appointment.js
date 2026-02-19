const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestAppointment() {
  console.log('🧪 Creating test appointment for cancellation testing...\n');
  
  try {
    // Find Branden and Brent
    const branden = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' },
      select: { id: true, name: true }
    });
    
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: { id: true, name: true }
    });
    
    if (!branden || !brent) {
      console.log('❌ Users not found');
      return;
    }
    
    // Create a test appointment for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // 2:00 PM
    
    const endTime = new Date(tomorrow);
    endTime.setHours(15, 0, 0, 0); // 3:00 PM
    
    const appointment = await prisma.appointment.create({
      data: {
        clientId: branden.id,
        trainerId: brent.id,
        title: 'Test Training Session',
        startTime: tomorrow,
        endTime: endTime,
        duration: 60,
        type: 'TRAINING_SESSION',
        status: 'APPROVED',
        notes: 'Test appointment for cancellation testing',
        createdAt: new Date()
      }
    });
    
    console.log('✅ Created test appointment:');
    console.log(`   ID: ${appointment.id}`);
    console.log(`   Client: ${branden.name} → Trainer: ${brent.name}`);
    console.log(`   Date: ${appointment.startTime.toLocaleDateString()}`);
    console.log(`   Time: ${appointment.startTime.toLocaleTimeString()}`);
    console.log(`   Status: ${appointment.status}`);
    console.log('\n📋 You can now test cancelling this appointment from the client dashboard!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAppointment();