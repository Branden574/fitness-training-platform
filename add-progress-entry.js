const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addTodaysProgress() {
  console.log('📊 Adding today\'s progress entry...');
  
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
    
    console.log(`📅 Adding progress entry for ${todayLocal.toLocaleDateString()}`);
    
    // Create a realistic progress entry (continuing the downward weight trend)
    const progressData = {
      userId: branden.id,
      date: todayLocal.toISOString(),
      weight: 178.2, // Continuing weight loss trend
      bodyFat: 9.5,  // Slight improvement
      muscleMass: 142.0, // Maintaining muscle
      mood: 8,       // Feeling great
      energy: 9,     // High energy
      sleep: 7.5,    // Good sleep
      notes: 'Great workout this morning! Feeling strong and energetic. Diet is on track.'
    };
    
    const entry = await prisma.progressEntry.create({
      data: progressData
    });
    
    console.log('✅ Added progress entry:');
    console.log(`   Weight: ${progressData.weight} lbs`);
    console.log(`   Body Fat: ${progressData.bodyFat}%`);
    console.log(`   Muscle Mass: ${progressData.muscleMass} lbs`);
    console.log(`   Mood: ${progressData.mood}/10`);
    console.log(`   Energy: ${progressData.energy}/10`);
    console.log(`   Sleep: ${progressData.sleep} hours`);
    console.log(`   Notes: ${progressData.notes}`);
    
    // Show progress trend
    const allEntries = await prisma.progressEntry.findMany({
      where: { userId: branden.id },
      orderBy: { date: 'asc' }
    });
    
    console.log(`\n📈 Progress trend for ${branden.name} (${allEntries.length} entries):`);
    allEntries.forEach((entry, index) => {
      const weightChange = index > 0 ? (entry.weight - allEntries[index - 1].weight).toFixed(1) : '0.0';
      const changeSymbol = parseFloat(weightChange) < 0 ? '↓' : parseFloat(weightChange) > 0 ? '↑' : '→';
      
      console.log(`   ${entry.date.toLocaleDateString()}: ${entry.weight}lbs ${changeSymbol} (${weightChange >= 0 ? '+' : ''}${weightChange})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTodaysProgress();