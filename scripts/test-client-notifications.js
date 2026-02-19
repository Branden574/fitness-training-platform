const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testClientNotifications() {
  console.log('🧪 Testing client notifications system...');

  try {
    // Find a client user
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' },
      select: { id: true, name: true, email: true }
    });

    if (!client) {
      console.log('❌ No client users found');
      return;
    }

    console.log('👤 Found client:', client.name);

    // Create a test notification for the client
    const notification = await prisma.notification.create({
      data: {
        userId: client.id,
        type: 'WORKOUT_ASSIGNED',
        title: 'Test Workout Assignment',
        message: `This is a test notification to verify the client notification system is working.`,
        actionUrl: `/client/dashboard?tab=workouts`
      }
    });

    console.log('✅ Created test notification:', notification.id);

    // Fetch notifications for this client
    const notifications = await prisma.notification.findMany({
      where: { userId: client.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Total notifications for client: ${notifications.length}`);
    notifications.forEach(notif => {
      console.log(`- ${notif.type}: ${notif.title} (${notif.read ? 'Read' : 'Unread'})`);
    });

    console.log('🎉 Client notification test completed!');

  } catch (error) {
    console.error('❌ Error testing client notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientNotifications();