const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNutritionPlans() {
  try {
    // Create some test nutrition plans
    const plans = await Promise.all([
      prisma.mealPlan.create({
        data: {
          name: "Weight Loss Plan",
          description: "Calorie deficit with balanced macros",
          userId: "cmfn3t3ic0002xninyonutrrn", // Client ID
          trainerId: "cmfn3t3aj0000xnin7m3gx2ao", // Trainer ID
          dailyCalorieTarget: 1600,
          dailyProteinTarget: 120,
          dailyCarbTarget: 150,
          dailyFatTarget: 60,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      }),
      prisma.mealPlan.create({
        data: {
          name: "Muscle Building",
          description: "Calorie surplus for lean muscle gain",
          userId: "cmfn3t3ic0002xninyonutrrn", // Client ID
          trainerId: "cmfn3t3aj0000xnin7m3gx2ao", // Trainer ID
          dailyCalorieTarget: 2400,
          dailyProteinTarget: 180,
          dailyCarbTarget: 250,
          dailyFatTarget: 80,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      }),
      prisma.mealPlan.create({
        data: {
          name: "Maintenance",
          description: "Balanced nutrition for weight maintenance",
          userId: "cmfn3t3ic0002xninyonutrrn", // Client ID
          trainerId: "cmfn3t3aj0000xnin7m3gx2ao", // Trainer ID
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 150,
          dailyCarbTarget: 200,
          dailyFatTarget: 70,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      })
    ]);

    console.log('✅ Created nutrition plans:', plans.length);
    
    // Fetch all plans to verify
    const allPlans = await prisma.mealPlan.findMany({
      include: {
        user: true,
        trainer: true
      }
    });
    
    console.log('📋 Total nutrition plans in database:', allPlans.length);
    allPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - ${plan.dailyCalorieTarget} calories`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNutritionPlans();