const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupAccounts() {
  try {
    console.log('=== CLEANING UP DUPLICATE ACCOUNTS ===\n');

    // First, let's see what we have
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    console.log('Current users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`);
    });

    // Find the two Brent accounts
    const brentTrainerOld = await prisma.user.findFirst({
      where: { email: 'brent@trainer.com' }
    });

    const brentTrainerCorrect = await prisma.user.findFirst({
      where: { email: 'Martinezfitness559@gmail.com' }
    });

    const branden = await prisma.user.findFirst({
      where: { email: 'branden574@gmail.com' }
    });

    console.log('\n=== REASSIGNING CLIENT TO CORRECT TRAINER ===');

    if (branden && brentTrainerCorrect) {
      // Update Branden to point to the correct trainer account
      await prisma.user.update({
        where: { id: branden.id },
        data: { trainerId: brentTrainerCorrect.id }
      });

      console.log(`✅ Updated Branden's trainer to: ${brentTrainerCorrect.name} (${brentTrainerCorrect.email})`);
    }

    console.log('\n=== DELETING DUPLICATE ACCOUNT ===');

    if (brentTrainerOld) {
      // Delete the old brent@trainer.com account
      await prisma.user.delete({
        where: { id: brentTrainerOld.id }
      });

      console.log(`✅ Deleted duplicate account: ${brentTrainerOld.name} (${brentTrainerOld.email})`);
    } else {
      console.log('ℹ️ No brent@trainer.com account found to delete');
    }

    console.log('\n=== VERIFICATION ===');

    // Verify the final state
    const finalUsers = await prisma.user.findMany({
      include: {
        assignedTrainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        clients: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log('\nFinal accounts:');
    finalUsers.forEach(user => {
      console.log(`\n📧 ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      
      if (user.role === 'CLIENT') {
        console.log(`   Trainer: ${user.assignedTrainer?.name || 'None'} (${user.assignedTrainer?.email || 'N/A'})`);
      } else if (user.role === 'TRAINER') {
        console.log(`   Clients: ${user.clients.length}`);
        user.clients.forEach(client => {
          console.log(`     - ${client.name} (${client.email})`);
        });
      }
    });

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\nNow you have:');
    console.log('1. Martinezfitness559@gmail.com (TRAINER) - Brent Martinez');
    console.log('2. branden574@gmail.com (CLIENT) - Branden Vincent-Walker');
    console.log('   → Assigned to Martinezfitness559@gmail.com trainer');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAccounts();