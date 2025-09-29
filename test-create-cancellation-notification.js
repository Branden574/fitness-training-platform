const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestCancellationNotification() {
  console.log('🧪 Creating test cancellation notification...\n');
  
  try {
    // Find Brent (trainer)
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: { id: true, name: true }
    });
    
    if (!brent) {
      console.log('❌ Brent not found');
      return;
    }
    
    // Create a test cancellation notification
    const notification = await prisma.notification.create({
      data: {
        userId: brent.id,
        type: 'APPOINTMENT_CANCELLED',
        title: 'Appointment Cancelled',
        message: 'Branden Vincent-Walker has cancelled their appointment scheduled for 9/21/2025 at 10:00:00 AM. Reason: Testing cancellation notifications',
        createdAt: new Date()
      }
    });
    
    console.log('✅ Created test cancellation notification:');
    console.log(`   ID: ${notification.id}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Title: ${notification.title}`);
    console.log(`   Message: ${notification.message}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCancellationNotification();