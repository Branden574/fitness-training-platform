const { PrismaClient } = require('@prisma/client');

async function testApiFixes() {
  const prisma = new PrismaClient();
  console.log('🧪 Testing API fixes...\n');
  
  try {
    
    // 1. Test nutrition plans for trainer (should only show templates)
    console.log('📋 Testing nutrition plans for trainer Brent...');
    const trainerNutritionPlans = await prisma.nutritionPlan.findMany({
      where: {
        trainerId: 'cm1gm3hzl0000qo9z1t3u2bkn'
      },
      include: {
        _count: {
          select: {
            assignments: true
          }
        }
      }
    });
    
    console.log(`Found ${trainerNutritionPlans.length} nutrition plans:`);
    trainerNutritionPlans.forEach(plan => {
      console.log(`  - ${plan.name} (ID: ${plan.id.slice(-8)})`);
      console.log(`    userId: ${plan.userId ? plan.userId.slice(-8) : 'null'} (${plan.userId ? 'ASSIGNMENT' : 'TEMPLATE'})`);
      console.log(`    Assigned to ${plan._count.assignments} clients\n`);
    });
    
    // What trainer should see (templates only)
    const templatesOnly = trainerNutritionPlans.filter(plan => plan.userId === plan.trainerId);
    console.log(`✅ Trainer should see ${templatesOnly.length} templates (not ${trainerNutritionPlans.length} total plans)\n`);
    
    // 2. Test notifications for trainer
    console.log('🔔 Testing notifications for trainer Brent...');
    const notifications = await prisma.notification.findMany({
      where: {
        userId: 'cm1gm3hzl0000qo9z1t3u2bkn'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    console.log(`Found ${notifications.length} notifications:`);
    notifications.forEach(notif => {
      const timeAgo = Math.round((Date.now() - notif.createdAt.getTime()) / (1000 * 60 * 60));
      console.log(`  - ${notif.type}: ${notif.message.slice(0, 50)}...`);
      console.log(`    Created ${timeAgo} hours ago (${notif.createdAt.toLocaleString()})\n`);
    });
    
    // 3. Test password change requirements
    console.log('🔐 Testing password change requirements...');
    const usersNeedingPasswordChange = await prisma.user.findMany({
      where: {
        passwordChangeRequired: true
      },
      select: {
        name: true,
        email: true,
        role: true,
        passwordChangeRequired: true
      }
    });
    
    console.log(`Found ${usersNeedingPasswordChange.length} users needing password change:`);
    usersNeedingPasswordChange.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiFixes();