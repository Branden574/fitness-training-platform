const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyFinalSetup() {
  try {
    console.log('=== FINAL VERIFICATION ===\n');

    const users = await prisma.user.findMany({
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

    console.log(`Total accounts: ${users.length}\n`);

    users.forEach(user => {
      console.log(`📧 ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      
      if (user.role === 'CLIENT') {
        console.log(`   Trainer: ${user.assignedTrainer?.name || 'None'} (${user.assignedTrainer?.email || 'N/A'})`);
        console.log(`   TrainerId: ${user.trainerId}`);
      } else if (user.role === 'TRAINER') {
        console.log(`   Clients: ${user.clients.length}`);
        user.clients.forEach(client => {
          console.log(`     - ${client.name} (${client.email})`);
        });
      }
      console.log('');
    });

    console.log('=== LOGIN CREDENTIALS ===');
    console.log('🔑 TRAINER (Brent Martinez):');
    console.log('   Email: Martinezfitness559@gmail.com');
    console.log('   Password: trainer123');
    console.log('');
    console.log('🔑 CLIENT (Branden Vincent-Walker):');
    console.log('   Email: branden574@gmail.com');
    console.log('   Password: branden123');
    console.log('');
    console.log('🌐 Test URLs:');
    console.log('   Sign in: http://localhost:3001/auth/signin');
    console.log('   Trainer Dashboard: http://localhost:3001/trainer/dashboard');
    console.log('   Client Dashboard: http://localhost:3001/client/dashboard');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFinalSetup();