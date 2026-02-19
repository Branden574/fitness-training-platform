import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProgressDates() {
  try {
    console.log('🔧 Starting progress date fix...');
    
    // Get all progress entries that might have incorrect dates
    const allEntries = await prisma.progress.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Found ${allEntries.length} progress entries to check`);
    
    for (const entry of allEntries) {
      console.log(`\n📝 Entry ID: ${entry.id}`);
      console.log(`📅 Current stored date: ${entry.date.toISOString()}`);
      console.log(`📅 Created at: ${entry.createdAt.toISOString()}`);
      
      // Check if this entry was created on Sept 22 but stored with Sept 21 date
      const createdDate = entry.createdAt;
      const storedDate = entry.date;
      
      // If created on Sept 22, 2025 but stored as Sept 21, fix it
      if (createdDate.getFullYear() === 2025 && 
          createdDate.getMonth() === 8 && // September (0-indexed)
          createdDate.getDate() === 22 &&
          storedDate.getUTCDate() === 21) {
        
        console.log(`🔧 Found entry that needs fixing!`);
        console.log(`   Created on: Sept 22, but stored as: Sept 21`);
        
        // Create the correct date at noon UTC for Sept 22
        const correctDate = new Date('2025-09-22T12:00:00.000Z');
        
        console.log(`✅ Updating to: ${correctDate.toISOString()}`);
        
        await prisma.progress.update({
          where: { id: entry.id },
          data: { date: correctDate }
        });
        
        console.log(`✅ Fixed entry ${entry.id}`);
      } else {
        console.log(`✅ Date is correct, no changes needed`);
      }
    }
    
    console.log('\n🎉 Progress date fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing progress dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProgressDates();