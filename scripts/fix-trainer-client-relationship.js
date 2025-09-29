const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTrainerClientRelationship() {
  try {
    // Find all users
    const users = await prisma.user.findMany({
      include: {
        clients: true,
        trainer: true
      }
    });

    console.log('=== CURRENT USER STATUS ===');
    users.forEach(user => {
      console.log(`\n${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`);
      if (user.role === 'TRAINER') {
        console.log(`  Clients: ${user.clients.length}`);
        user.clients.forEach(client => {
          console.log(`    - ${client.name} (${client.email})`);
        });
      } else if (user.role === 'CLIENT') {
        console.log(`  Trainer: ${user.trainer ? user.trainer.name + ' (' + user.trainer.email + ')' : 'None'}`);
        console.log(`  TrainerId: ${user.trainerId || 'None'}`);
      }
    });

    // Find Branden (client)
    const branden = await prisma.user.findFirst({
      where: { email: 'branden574@gmail.com' }
    });

    // Find primary Brent trainer (the one with brent@trainer.com)
    const brentTrainer = await prisma.user.findFirst({
      where: { 
        email: 'brent@trainer.com',
        role: 'TRAINER'
      }
    });

    console.log('\n=== FIXING RELATIONSHIP ===');
    console.log(`Branden ID: ${branden?.id}`);
    console.log(`Brent Trainer ID: ${brentTrainer?.id}`);

    if (branden && brentTrainer) {
      // Update Branden to have Brent as trainer
      const updated = await prisma.user.update({
        where: { id: branden.id },
        data: { trainerId: brentTrainer.id }
      });

      console.log(`✅ Updated Branden's trainer to: ${brentTrainer.name}`);
      
      // Verify the relationship
      const verification = await prisma.user.findUnique({
        where: { id: branden.id },
        include: { trainer: true }
      });

      console.log('\n=== VERIFICATION ===');
      console.log(`Branden's trainer: ${verification.trainer?.name} (${verification.trainer?.email})`);

      // Also check Brent's clients
      const brentWithClients = await prisma.user.findUnique({
        where: { id: brentTrainer.id },
        include: { clients: true }
      });

      console.log(`Brent's clients: ${brentWithClients.clients.length}`);
      brentWithClients.clients.forEach(client => {
        console.log(`  - ${client.name} (${client.email})`);
      });

    } else {
      console.log('❌ Could not find both users');
      if (!branden) console.log('Branden not found');
      if (!brentTrainer) console.log('Brent trainer not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTrainerClientRelationship();