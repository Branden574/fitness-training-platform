const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTodaysFoodEntries() {
  console.log('🍎 Adding today\'s food entries for testing...');
  
  try {
    // Get Branden's user ID
    const branden = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' },
      select: { id: true, name: true }
    });
    
    if (!branden) {
      console.log('❌ Could not find Branden\'s account');
      return;
    }
    
    // Create today's date in local timezone
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log(`📅 Adding entries for ${todayLocal.toLocaleDateString()}`);
    
    // Sample food entries for today
    const foodEntries = [
      {
        foodName: 'Greek Yogurt with Berries',
        quantity: 200,
        unit: 'grams',
        calories: 150,
        protein: 15,
        carbs: 20,
        fat: 3,
        mealType: 'BREAKFAST',
        notes: 'Morning protein boost'
      },
      {
        foodName: 'Grilled Chicken Breast',
        quantity: 150,
        unit: 'grams',
        calories: 230,
        protein: 43,
        carbs: 0,
        fat: 5,
        mealType: 'LUNCH',
        notes: 'Post-workout meal'
      },
      {
        foodName: 'Brown Rice',
        quantity: 100,
        unit: 'grams',
        calories: 110,
        protein: 2.5,
        carbs: 23,
        fat: 0.9,
        mealType: 'LUNCH'
      },
      {
        foodName: 'Mixed Nuts',
        quantity: 30,
        unit: 'grams',
        calories: 180,
        protein: 5,
        carbs: 6,
        fat: 16,
        mealType: 'SNACK',
        notes: 'Healthy fats snack'
      }
    ];
    
    // Add each food entry
    for (const food of foodEntries) {
      const entry = await prisma.foodEntry.create({
        data: {
          userId: branden.id,
          date: todayLocal.toISOString(),
          ...food
        }
      });
      
      console.log(`✅ Added: ${food.foodName} (${food.calories} cal, ${food.mealType})`);
    }
    
    // Calculate totals
    const totalCalories = foodEntries.reduce((sum, food) => sum + food.calories, 0);
    const totalProtein = foodEntries.reduce((sum, food) => sum + food.protein, 0);
    const totalCarbs = foodEntries.reduce((sum, food) => sum + food.carbs, 0);
    const totalFat = foodEntries.reduce((sum, food) => sum + food.fat, 0);
    
    console.log(`\n📊 Today's totals for ${branden.name}:`);
    console.log(`   Calories: ${totalCalories}`);
    console.log(`   Protein: ${totalProtein.toFixed(1)}g`);
    console.log(`   Carbs: ${totalCarbs.toFixed(1)}g`);
    console.log(`   Fat: ${totalFat.toFixed(1)}g`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTodaysFoodEntries();