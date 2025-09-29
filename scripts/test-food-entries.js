const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestFoodEntries() {
  try {
    // Get the first client user
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT' }
    });

    if (!client) {
      console.log('No client found. Creating test client...');
      const newClient = await prisma.user.create({
        data: {
          email: 'testclient@example.com',
          name: 'Test Client',
          role: 'CLIENT',
          password: 'demo123'
        }
      });
      client = newClient;
    }

    console.log('Found client:', client.name, client.id);

    // Create some test food entries for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const foodEntries = [
      {
        userId: client.id,
        foodName: 'Oatmeal with Banana',
        quantity: 1,
        unit: 'bowl',
        calories: 350,
        protein: 12,
        carbs: 58,
        fat: 8,
        mealType: 'BREAKFAST',
        date: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        notes: 'Steel cut oats with sliced banana and almond milk'
      },
      {
        userId: client.id,
        foodName: 'Greek Yogurt',
        quantity: 150,
        unit: 'grams',
        calories: 100,
        protein: 15,
        carbs: 6,
        fat: 0,
        mealType: 'SNACK',
        date: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM
        notes: 'Plain Greek yogurt, 0% fat'
      },
      {
        userId: client.id,
        foodName: 'Grilled Chicken Salad',
        quantity: 1,
        unit: 'plate',
        calories: 420,
        protein: 35,
        carbs: 12,
        fat: 18,
        mealType: 'LUNCH',
        date: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12 PM
        notes: 'Mixed greens, grilled chicken breast, olive oil dressing'
      },
      {
        userId: client.id,
        foodName: 'Apple',
        quantity: 1,
        unit: 'medium',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        mealType: 'SNACK',
        date: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3 PM
        notes: 'Medium Honeycrisp apple'
      },
      {
        userId: client.id,
        foodName: 'Salmon with Sweet Potato',
        quantity: 1,
        unit: 'plate',
        calories: 580,
        protein: 42,
        carbs: 35,
        fat: 28,
        mealType: 'DINNER',
        date: new Date(today.getTime() + 19 * 60 * 60 * 1000), // 7 PM
        notes: 'Baked salmon fillet with roasted sweet potato and broccoli'
      }
    ];

    // Create food entries
    for (const entry of foodEntries) {
      await prisma.foodEntry.create({
        data: entry
      });
      console.log(`Created food entry: ${entry.foodName}`);
    }

    // Calculate daily totals
    const dailyTotals = await prisma.foodEntry.aggregate({
      where: {
        userId: client.id,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true
      }
    });

    console.log('Daily totals for client:', {
      calories: dailyTotals._sum.calories,
      protein: dailyTotals._sum.protein,
      carbs: dailyTotals._sum.carbs,
      fat: dailyTotals._sum.fat
    });

    console.log('✅ Test food entries created successfully!');

  } catch (error) {
    console.error('Error creating test food entries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestFoodEntries();