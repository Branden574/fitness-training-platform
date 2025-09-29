const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testNotificationsAndPassword() {
  console.log('🧪 Testing notifications and password reset...');
  
  try {
    // Test 1: Check recent notifications
    console.log('\n📋 Recent Notifications:');
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true, email: true, role: true } }
      }
    });
    
    notifications.forEach(notif => {
      console.log(`  - "${notif.title}" for ${notif.user.name} (${notif.user.role})`);
      console.log(`    Type: ${notif.type}, Created: ${notif.createdAt}`);
      console.log(`    Message: ${notif.message}`);
      console.log('');
    });
    
    // Test 2: Check users with password change required
    console.log('\n🔐 Users requiring password change:');
    const usersNeedingPasswordChange = await prisma.user.findMany({
      where: { passwordChangeRequired: true },
      select: { name: true, email: true, role: true, passwordChangeRequired: true }
    });
    
    usersNeedingPasswordChange.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
    if (usersNeedingPasswordChange.length === 0) {
      console.log('  No users currently require password change');
      
      // Create a test user that needs password change
      console.log('\n🔧 Creating test user with password change requirement...');
      const hashedPassword = await bcrypt.hash('temp123', 12);
      
      await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: hashedPassword,
          role: 'CLIENT',
          passwordChangeRequired: true
        }
      });
      
      console.log('✅ Created test@example.com with password "temp123" (requires change)');
    }
    
    // Test 3: Create a test notification
    console.log('\n🔔 Creating test notification...');
    const trainer = await prisma.user.findFirst({
      where: { role: 'TRAINER' }
    });
    
    if (trainer) {
      await prisma.notification.create({
        data: {
          userId: trainer.id,
          type: 'MEAL_PLAN_ENDED',
          title: 'Test Notification',
          message: 'This is a test notification to verify the notification system is working.',
          actionUrl: '/trainer/dashboard'
        }
      });
      
      console.log(`✅ Created test notification for ${trainer.name}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotificationsAndPassword();