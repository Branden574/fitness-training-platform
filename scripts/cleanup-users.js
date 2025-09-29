const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupUsers() {
  try {
    console.log('🧹 Cleaning up database to keep only essential accounts...');
    
    // Keep only these essential accounts
    const keepEmails = [
      'branden574@gmail.com',           // Main client
      'martinezfitness559@gmail.com',   // Brent's trainer account
      'admin@brentmartinezfitness.com'  // Admin account
    ];
    
    // Delete users not in the keep list
    const deleteResult = await prisma.user.deleteMany({
      where: {
        email: {
          notIn: keepEmails
        }
      }
    });
    
    console.log(`🗑️ Deleted ${deleteResult.count} unnecessary user accounts`);
    
    // Show remaining users
    const remainingUsers = await prisma.user.findMany({
      select: {
        name: true,
        email: true,
        role: true,
        trainerId: true
      },
      orderBy: { role: 'asc' }
    });
    
    console.log('\\n✅ Final user accounts:');
    console.log('═══════════════════════════════════════');
    
    remainingUsers.forEach((user, index) => {
      const trainerInfo = user.trainerId ? ' 👨‍🏋️ (assigned to trainer)' : '';
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   Role: ${user.role}${trainerInfo}`);
      console.log('');
    });
    
    // Ensure branden574 is assigned to Brent's trainer account
    const trainer = await prisma.user.findUnique({
      where: { email: 'martinezfitness559@gmail.com' }
    });
    
    if (trainer) {
      await prisma.user.update({
        where: { email: 'branden574@gmail.com' },
        data: { trainerId: trainer.id }
      });
      console.log('✅ Ensured branden574 is assigned to Brent as trainer');
    }
    
    console.log('\\n🎉 Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupUsers();
}

module.exports = { cleanupUsers };