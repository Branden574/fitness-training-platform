const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupExpiredPlans() {
  console.log('🧹 Cleaning up expired nutrition plans...');
  
  try {
    const now = new Date();
    
    // Find all plans and filter out templates and active plans
    const allPlans = await prisma.mealPlan.findMany({
      include: {
        user: { select: { name: true, email: true } },
        trainer: { select: { name: true, email: true } }
      }
    });
    
    const expiredPlans = allPlans.filter(plan => {
      const isTemplate = plan.trainerId === plan.userId;
      const isExpired = plan.endDate < now;
      return !isTemplate && isExpired;
    });
    
    console.log(`📋 Found ${expiredPlans.length} expired plans:`);
    expiredPlans.forEach(plan => {
      console.log(`  - "${plan.name}" for ${plan.user.name} (ended: ${plan.endDate})`);
    });
    
    if (expiredPlans.length > 0) {
      // Delete expired plans by ID
      const expiredIds = expiredPlans.map(plan => plan.id);
      const result = await prisma.mealPlan.deleteMany({
        where: {
          id: { in: expiredIds }
        }
      });
      
      console.log(`✅ Deleted ${result.count} expired plans`);
    } else {
      console.log('✅ No expired plans to clean up');
    }
    
    // Show current active plans
    const remainingPlans = await prisma.mealPlan.findMany({
      include: {
        user: { select: { name: true, email: true } },
        trainer: { select: { name: true, email: true } }
      }
    });
    
    console.log(`\n📊 Remaining plans (${remainingPlans.length}):`);
    remainingPlans.forEach(plan => {
      const isTemplate = plan.trainerId === plan.userId;
      const status = plan.endDate > now ? 'ACTIVE' : 'EXPIRED';
      console.log(`  - "${plan.name}" → ${plan.user.name} ${isTemplate ? '(TEMPLATE)' : `(${status})`}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupExpiredPlans();