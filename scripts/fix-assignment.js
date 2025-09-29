/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndFixAssignment() {
  try {
    console.log('=== CHECKING TRAINER ASSIGNMENT ===');
    
    const branden = await prisma.user.findUnique({
      where: { email: 'branden574@gmail.com' },
      include: {
        assignedTrainer: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    });
    
    const brent = await prisma.user.findUnique({
      where: { email: 'brent@trainer.com' },
      select: { id: true, name: true, email: true, role: true }
    });
    
    console.log('Branden (CLIENT):');
    console.log('  TrainerId:', branden?.trainerId || 'NULL');
    console.log('  Assigned Trainer:', branden?.assignedTrainer?.name || 'NONE');
    
    console.log('Brent (TRAINER):');
    console.log('  ID:', brent?.id);
    console.log('  Name:', brent?.name);
    
    // Fix the assignment
    if (branden && brent) {
      await prisma.user.update({
        where: { email: 'branden574@gmail.com' },
        data: { trainerId: brent.id }
      });
      
      console.log('✅ Updated trainer assignment');
      
      // Verify the fix
      const updated = await prisma.user.findUnique({
        where: { email: 'branden574@gmail.com' },
        include: {
          assignedTrainer: {
            select: { name: true, email: true }
          }
        }
      });
      
      console.log('Verification:');
      console.log('  New TrainerId:', updated?.trainerId);
      console.log('  New Assigned Trainer:', updated?.assignedTrainer?.name);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixAssignment();