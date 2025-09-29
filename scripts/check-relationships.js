/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClientTrainerRelationships() {
  try {
    console.log('=== CLIENT-TRAINER RELATIONSHIPS ===');
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        trainerId: true,
        assignedTrainer: {
          select: { name: true, email: true }
        }
      }
    });
    
    users.forEach(user => {
      if (user.role === 'CLIENT') {
        console.log(`CLIENT: ${user.name} (${user.email})`);
        if (user.trainerId) {
          console.log(`  → Assigned to trainer: ${user.assignedTrainer?.name || 'Unknown'}`);
        } else {
          console.log(`  → NO TRAINER ASSIGNED`);
        }
      } else if (user.role === 'TRAINER') {
        console.log(`TRAINER: ${user.name} (${user.email}) [ID: ${user.id}]`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientTrainerRelationships();