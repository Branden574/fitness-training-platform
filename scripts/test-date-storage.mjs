import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDateStorage() {
  try {
    // Test today's date handling
    const todayString = '2025-09-21'; // What the client sends
    console.log('📅 Testing date storage for:', todayString);
    
    // Client-side date string processing
    console.log('🖥️ Client side:');
    console.log('   selectedDate:', todayString);
    
    // API processing (same as food-entries/route.ts)
    console.log('\n🔧 API processing:');
    const [year, month, day] = todayString.split('-').map(Number);
    const entryDate = new Date(year, month - 1, day);
    console.log('   Parsed components:', { year, month: month - 1, day });
    console.log('   entryDate (local):', entryDate.toString());
    console.log('   entryDate (ISO):', entryDate.toISOString());
    
    // Check what gets stored in database
    console.log('\n💾 Database storage test:');
    const client = await prisma.user.findFirst({
      where: { role: 'CLIENT', email: 'branden574@gmail.com' }
    });
    
    if (!client) {
      console.log('❌ No client found');
      return;
    }
    
    // Create test entry
    const testEntry = await prisma.foodEntry.create({
      data: {
        userId: client.id,
        foodName: 'TEST_DATE_STORAGE',
        quantity: 1,
        unit: 'grams',
        calories: 1,
        protein: 0,
        carbs: 0,
        fat: 0,
        mealType: 'SNACK',
        date: entryDate,
        notes: 'Date storage test'
      }
    });
    
    console.log('✅ Created test entry:');
    console.log('   ID:', testEntry.id);
    console.log('   Stored date (toString):', testEntry.date.toString());
    console.log('   Stored date (ISO):', testEntry.date.toISOString());
    console.log('   Date split:', testEntry.date.toISOString().split('T')[0]);
    
    // Clean up test entry
    await prisma.foodEntry.delete({ where: { id: testEntry.id } });
    console.log('🗑️ Cleaned up test entry');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDateStorage();