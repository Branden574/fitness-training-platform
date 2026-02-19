const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTemplates() {
  console.log('🔧 Creating nutrition plan templates...');
  
  try {
    // Get the correct trainer account
    const trainer = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });
    
    if (!trainer) {
      console.log('❌ Trainer not found');
      return;
    }
    
    console.log(`👨‍🏫 Found trainer: ${trainer.name} (${trainer.email})`);
    
    // Create a template by assigning a plan to the trainer themselves
    const template = await prisma.mealPlan.create({
      data: {
        name: 'Weight Loss Template',
        description: 'A balanced weight loss nutrition plan template that can be assigned to clients.',
        trainerId: trainer.id,
        userId: trainer.id, // Assign to trainer themselves = template
        dailyCalorieTarget: 1800,
        dailyProteinTarget: 140,
        dailyCarbTarget: 180,
        dailyFatTarget: 60,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });
    
    console.log(`✅ Created template: "${template.name}" (ID: ${template.id})`);
    
    // Create another template
    const template2 = await prisma.mealPlan.create({
      data: {
        name: 'Muscle Building Template',
        description: 'High protein nutrition plan for muscle building and strength gains.',
        trainerId: trainer.id,
        userId: trainer.id, // Assign to trainer themselves = template
        dailyCalorieTarget: 2500,
        dailyProteinTarget: 200,
        dailyCarbTarget: 300,
        dailyFatTarget: 80,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    });
    
    console.log(`✅ Created template: "${template2.name}" (ID: ${template2.id})`);
    
    // Show all plans now
    const allPlans = await prisma.mealPlan.findMany({
      where: { trainerId: trainer.id },
      include: {
        user: { select: { name: true, email: true } }
      }
    });
    
    console.log(`\n📋 All plans for ${trainer.name}:`);
    allPlans.forEach(plan => {
      const isTemplate = plan.trainerId === plan.userId;
      console.log(`  - "${plan.name}" → ${plan.user.name} ${isTemplate ? '(TEMPLATE)' : '(ASSIGNED)'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTemplates();