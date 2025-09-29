const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCancellationNotifications() {
  console.log('🧪 Testing appointment cancellation notifications...\n');
  
  try {
    // Find Branden and Brent
    const branden = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' },
      select: { id: true, name: true, email: true }
    });
    
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' },
      select: { id: true, name: true, email: true }
    });
    
    if (!branden || !brent) {
      console.log('❌ Users not found');
      return;
    }
    
    console.log(`👤 Found Branden: ${branden.name} (${branden.id.slice(-8)})`);
    console.log(`👤 Found Brent: ${brent.name} (${brent.id.slice(-8)})\n`);
    
    // Find recent appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { clientId: branden.id },
          { trainerId: brent.id }
        ]
      },
      include: {
        client: { select: { name: true, email: true } },
        trainer: { select: { name: true, email: true } }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`📅 Found ${appointments.length} recent appointments:`);
    appointments.forEach(apt => {
      console.log(`  - ${apt.id.slice(-8)}: ${apt.client.name} ↔ ${apt.trainer.name}`);
      console.log(`    Status: ${apt.status}, Date: ${apt.startTime.toLocaleDateString()}`);
    });
    
    // Check current notifications
    console.log('\n🔔 Current notifications for Brent:');
    const brentNotifications = await prisma.notification.findMany({
      where: { userId: brent.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    brentNotifications.forEach(notif => {
      console.log(`  - ${notif.type}: ${notif.title}`);
      console.log(`    ${notif.message.slice(0, 60)}...`);
      console.log(`    Created: ${notif.createdAt.toLocaleString()}\n`);
    });
    
    console.log('\n🔔 Current notifications for Branden:');
    const brandenNotifications = await prisma.notification.findMany({
      where: { userId: branden.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    brandenNotifications.forEach(notif => {
      console.log(`  - ${notif.type}: ${notif.title}`);
      console.log(`    ${notif.message.slice(0, 60)}...`);
      console.log(`    Created: ${notif.createdAt.toLocaleString()}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCancellationNotifications();