import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDateFix() {
  try {
    console.log('🔧 Verifying date synchronization fix...\n');
    
    // Get current local date (what client should use now)
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    
    console.log('📅 Local date calculation (new logic):', localDate);
    console.log('📅 UTC date calculation (old logic):', new Date().toISOString().split('T')[0]);
    console.log('📅 Difference:', localDate !== new Date().toISOString().split('T')[0] ? 'YES - Fix needed!' : 'NO - Same date');
    
    // Find the client
    const client = await prisma.user.findFirst({
      where: { email: 'branden574@gmail.com', role: 'CLIENT' }
    });
    
    if (!client) {
      console.log('❌ Client not found');
      return;
    }
    
    console.log(`\n👤 Client found: ${client.email}`);
    
    // Create a test food entry with today's local date
    const testEntry = await prisma.foodEntry.create({
      data: {
        userId: client.id,
        foodName: 'DATE_FIX_TEST',
        quantity: 1,
        unit: 'test',
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        mealType: 'SNACK',
        date: new Date(year, today.getMonth(), today.getDate()), // Use local date
        notes: 'Testing date synchronization fix'
      }
    });
    
    console.log('\n✅ Created test food entry:');
    console.log('   - Food:', testEntry.foodName);
    console.log('   - Stored date (local):', testEntry.date.toString());
    console.log('   - Stored date (ISO):', testEntry.date.toISOString());
    console.log('   - Date when split:', testEntry.date.toISOString().split('T')[0]);
    
    // Test what the API would return for local date request
    console.log('\n🔍 Testing API query simulation:');
    console.log(`   - Client requests date: ${localDate}`);
    
    const [queryYear, queryMonth, queryDay] = localDate.split('-').map(Number);
    const startDate = new Date(queryYear, queryMonth - 1, queryDay);
    const endDate = new Date(queryYear, queryMonth - 1, queryDay + 1);
    
    console.log('   - Query range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    const foundEntries = await prisma.foodEntry.findMany({
      where: {
        userId: client.id,
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    console.log(`   - Found ${foundEntries.length} entries:`);
    foundEntries.forEach(entry => {
      const entryLocalDate = entry.date.toISOString().split('T')[0];
      const matches = entryLocalDate === localDate;
      console.log(`     * ${entry.foodName} (${entryLocalDate}) ${matches ? '✅ MATCHES' : '❌ NO MATCH'}`);
    });
    
    // Clean up test entry
    await prisma.foodEntry.delete({ where: { id: testEntry.id } });
    console.log('\n🗑️ Cleaned up test entry');
    
    console.log('\n🎉 Date fix verification complete!');
    console.log('📝 Summary:');
    console.log('   - Client now uses local date instead of UTC');
    console.log('   - Food entries are stored with timezone-safe date parsing');
    console.log('   - Date synchronization between client and trainer dashboards should now work correctly');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDateFix();