const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMoreNutritionPlans() {
  try {
    console.log('🔄 Creating additional nutrition plans...');
    
    const brent = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });
    
    if (!brent) {
      console.error('❌ Brent not found');
      return;
    }
    
    // Create multiple nutrition plans for different goals
    const nutritionPlans = [
      {
        name: 'Muscle Building Plan',
        description: 'High protein nutrition plan designed for muscle growth and strength gains',
        dailyCalorieTarget: 2500,
        dailyProteinTarget: 150,
        dailyCarbTarget: 300,
        dailyFatTarget: 85,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      },
      {
        name: 'Fat Loss Plan',
        description: 'Calorie-controlled plan for sustainable fat loss while preserving muscle',
        dailyCalorieTarget: 1600,
        dailyProteinTarget: 130,
        dailyCarbTarget: 120,
        dailyFatTarget: 65,
        startDate: new Date(),
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000) // 45 days
      },
      {
        name: 'Performance Plan',
        description: 'Optimized nutrition for athletic performance and recovery',
        dailyCalorieTarget: 2800,
        dailyProteinTarget: 160,
        dailyCarbTarget: 350,
        dailyFatTarget: 90,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      },
      {
        name: 'Maintenance Plan',
        description: 'Balanced nutrition plan for weight maintenance and overall health',
        dailyCalorieTarget: 2000,
        dailyProteinTarget: 120,
        dailyCarbTarget: 250,
        dailyFatTarget: 70,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        name: 'Beginner Plan',
        description: 'Simple, easy-to-follow nutrition plan for fitness beginners',
        dailyCalorieTarget: 1800,
        dailyProteinTarget: 110,
        dailyCarbTarget: 200,
        dailyFatTarget: 60,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    ];
    
    // Create the plans
    for (const planData of nutritionPlans) {
      await prisma.mealPlan.create({
        data: {
          ...planData,
          trainerId: brent.id,
          // Leave userId as null so they can be assigned
        }
      });
    }
    
    console.log(`✅ Created ${nutritionPlans.length} additional nutrition plans`);
    
    // Verify the plans were created
    const allPlans = await prisma.mealPlan.findMany({
      where: { trainerId: brent.id },
      include: { user: { select: { name: true } } }
    });
    
    console.log(`\n📋 ALL NUTRITION PLANS (${allPlans.length}):`);
    allPlans.forEach((plan, i) => {
      console.log(`   ${i+1}. ${plan.name}`);
      console.log(`      Status: ${plan.userId ? 'Assigned to ' + plan.user?.name : 'AVAILABLE FOR ASSIGNMENT'}`);
      console.log(`      Calories: ${plan.dailyCalorieTarget}, Protein: ${plan.dailyProteinTarget}g`);
    });
    
    console.log('\n🎉 Nutrition plans ready for assignment!');
    
  } catch (error) {
    console.error('❌ Error creating nutrition plans:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMoreNutritionPlans();