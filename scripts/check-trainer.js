const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTrainerExists() {
  try {
    console.log('🔍 Checking if trainer exists...');
    
    const trainerId = "cmfn3t3aj0000xnin7m3gx2ao";
    
    const trainer = await prisma.user.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    if (trainer) {
      console.log('✅ Trainer found:', trainer);
    } else {
      console.log('❌ Trainer NOT found with ID:', trainerId);
      
      // Find all users with TRAINER role
      const trainers = await prisma.user.findMany({
        where: { role: 'TRAINER' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });
      
      console.log('📋 All trainers in database:', trainers);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrainerExists();