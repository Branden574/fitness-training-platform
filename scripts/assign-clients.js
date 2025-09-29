/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignClientsToTrainer() {
  try {
    // Get Brent Martinez's ID (the trainer)
    const brentMartinez = await prisma.user.findUnique({
      where: { email: 'admin@brentmartinezfitness.com' }
    });
    
    if (!brentMartinez) {
      console.error('Brent Martinez not found!');
      return;
    }
    
    console.log(`Trainer: ${brentMartinez.name} (ID: ${brentMartinez.id})`);
    
    // Get all clients
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, name: true, email: true, trainerId: true }
    });
    
    console.log('\n=== ASSIGNING CLIENTS TO TRAINER ===');
    
    for (const client of clients) {
      const result = await prisma.user.update({
        where: { id: client.id },
        data: { trainerId: brentMartinez.id }
      });
      
      console.log(`✅ Assigned ${client.name} (${client.email}) to Brent Martinez`);
    }
    
    console.log('\n=== VERIFICATION ===');
    const updatedUsers = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      include: {
        assignedTrainer: {
          select: { name: true, email: true }
        }
      }
    });
    
    updatedUsers.forEach(user => {
      console.log(`${user.name} → Trainer: ${user.assignedTrainer?.name || 'None'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignClientsToTrainer();