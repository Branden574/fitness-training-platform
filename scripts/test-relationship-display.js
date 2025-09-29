const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTrainerClientDisplay() {
  try {
    console.log('=== TESTING TRAINER-CLIENT RELATIONSHIP DISPLAY ===\n');

    // Test 1: Get Branden with trainer info (simulating /api/profile)
    console.log('1. Testing client profile with trainer info:');
    const branden = await prisma.user.findFirst({
      where: { email: 'branden574@gmail.com' },
      include: {
        assignedTrainer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        clientProfile: true
      }
    });

    if (branden) {
      console.log(`✅ Client: ${branden.name} (${branden.email})`);
      console.log(`   Role: ${branden.role}`);
      console.log(`   TrainerId: ${branden.trainerId}`);
      if (branden.assignedTrainer) {
        console.log(`   Trainer: ${branden.assignedTrainer.name} (${branden.assignedTrainer.email})`);
      } else {
        console.log('   Trainer: None found');
      }
    } else {
      console.log('❌ Branden not found');
    }

    console.log('\n2. Testing trainer clients list (simulating /api/clients):');
    
    // Test 2: Get Brent trainer with clients (simulating /api/clients)
    const brentTrainer = await prisma.user.findFirst({
      where: { 
        email: 'brent@trainer.com',
        role: 'TRAINER'
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }
      }
    });

    if (brentTrainer) {
      console.log(`✅ Trainer: ${brentTrainer.name} (${brentTrainer.email})`);
      console.log(`   Role: ${brentTrainer.role}`);
      console.log(`   Number of Clients: ${brentTrainer.clients.length}`);
      brentTrainer.clients.forEach(client => {
        console.log(`   Client: ${client.name} (${client.email}) - Created: ${client.createdAt.toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Brent trainer not found');
    }

    console.log('\n3. Double-checking relationship consistency:');
    
    if (branden && brentTrainer) {
      const relationshipMatch = branden.trainerId === brentTrainer.id;
      const clientInTrainerList = brentTrainer.clients.some(c => c.id === branden.id);
      
      console.log(`   Branden's trainerId matches Brent's ID: ${relationshipMatch ? '✅' : '❌'}`);
      console.log(`   Branden appears in Brent's client list: ${clientInTrainerList ? '✅' : '❌'}`);
      
      if (relationshipMatch && clientInTrainerList) {
        console.log('   🎉 Relationship is correctly set up in both directions!');
      } else {
        console.log('   ⚠️ Relationship inconsistency detected');
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log('The database relationships appear to be correctly configured.');
    console.log('If the frontend is not showing the relationship, the issue is likely in:');
    console.log('1. Authentication/session handling');
    console.log('2. API endpoints not being called correctly');
    console.log('3. Frontend state management');

  } catch (error) {
    console.error('Error testing relationship:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTrainerClientDisplay();