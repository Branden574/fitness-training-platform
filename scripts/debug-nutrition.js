const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugNutrition() {
  console.log('🔍 Debugging nutrition plans...');
  
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    console.log('\n👥 Users:');
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`);
    });
    
    // Get all meal plans
    const mealPlans = await prisma.mealPlan.findMany({
      include: {
        user: {
          select: { name: true, email: true, role: true }
        },
        trainer: {
          select: { name: true, email: true, role: true }
        }
      }
    });
    
    console.log('\n🍽️ Meal Plans:');
    mealPlans.forEach(plan => {
      console.log(`  - "${plan.name}" (ID: ${plan.id})`);
      console.log(`    Created by: ${plan.trainer.name} (${plan.trainer.email})`);
      console.log(`    Assigned to: ${plan.user.name} (${plan.user.email})`);
      console.log(`    Template?: ${plan.trainerId === plan.userId}`);
      console.log(`    Start: ${plan.startDate}, End: ${plan.endDate}`);
      console.log('');
    });
    
    // Check trainer-client relationships
    const trainers = users.filter(u => u.role === 'TRAINER');
    for (const trainer of trainers) {
      const clients = await prisma.user.findMany({
        where: {
          trainerId: trainer.id,
          role: 'CLIENT'
        },
        select: { id: true, name: true, email: true }
      });
      
      console.log(`👨‍🏫 Trainer ${trainer.name} has ${clients.length} clients:`);
      clients.forEach(client => {
        console.log(`  - ${client.name} (${client.email}) - ID: ${client.id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugNutrition();