const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFoodEntriesAPI() {
  try {
    // Get the client
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });

    if (!client) {
      console.log('No client found');
      return;
    }

    console.log('Testing food entries for client:', client.name);

    // Test the basic query that the API would use
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get food entries for today
    const entries = await prisma.foodEntry.findMany({
      where: {
        userId: client.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`Found ${entries.length} food entries for today`);
    
    entries.forEach(entry => {
      console.log(`- ${entry.foodName}: ${entry.calories} cal, ${entry.protein}g protein`);
    });

    // Calculate daily totals
    const totals = await prisma.foodEntry.aggregate({
      where: {
        userId: client.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true
      }
    });

    console.log('Daily totals:', {
      calories: totals._sum.calories || 0,
      protein: totals._sum.protein || 0,
      carbs: totals._sum.carbs || 0,
      fat: totals._sum.fat || 0
    });

    console.log('✅ Food entries API test successful!');

  } catch (error) {
    console.error('Error testing food entries API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFoodEntriesAPI();