const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAndFixRelationship() {
  try {
    console.log('=== CHECKING TRAINER-CLIENT RELATIONSHIP ===\n');

    // Get Branden with trainer info
    const branden = await prisma.user.findFirst({
      where: { email: 'branden574@gmail.com' },
      include: {
        assignedTrainer: true
      }
    });

    // Get Brent trainer with clients
    const brentTrainer = await prisma.user.findFirst({
      where: { 
        email: 'brent@trainer.com',
        role: 'TRAINER'
      },
      include: {
        clients: true
      }
    });

    console.log('BRANDEN CLIENT INFO:');
    console.log(`Name: ${branden?.name}`);
    console.log(`Email: ${branden?.email}`);
    console.log(`TrainerId: ${branden?.trainerId}`);
    console.log(`Assigned Trainer: ${branden?.assignedTrainer?.name || 'None'} (${branden?.assignedTrainer?.email || 'N/A'})`);

    console.log('\nBRENT TRAINER INFO:');
    console.log(`Name: ${brentTrainer?.name}`);
    console.log(`Email: ${brentTrainer?.email}`);
    console.log(`Number of Clients: ${brentTrainer?.clients?.length || 0}`);
    brentTrainer?.clients?.forEach(client => {
      console.log(`  Client: ${client.name} (${client.email})`);
    });

    // Check if relationship is correct
    if (branden?.trainerId === brentTrainer?.id) {
      console.log('\n✅ Relationship is correctly set in database');
      
      // Double check by doing a fresh query
      const freshCheck = await prisma.user.findUnique({
        where: { id: branden.id },
        include: {
          assignedTrainer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log('\nFRESH QUERY RESULT:');
      console.log(`Branden's trainer: ${freshCheck?.assignedTrainer?.name || 'None'} (${freshCheck?.assignedTrainer?.email || 'N/A'})`);

    } else {
      console.log('\n❌ Relationship needs to be fixed');
      
      if (branden && brentTrainer) {
        console.log(`\nFixing: Setting Branden's trainerId from ${branden.trainerId} to ${brentTrainer.id}`);
        
        await prisma.user.update({
          where: { id: branden.id },
          data: { trainerId: brentTrainer.id }
        });

        console.log('✅ Relationship updated');

        // Verify
        const verification = await prisma.user.findUnique({
          where: { id: branden.id },
          include: {
            assignedTrainer: true
          }
        });

        console.log(`Verification: ${verification?.assignedTrainer?.name || 'None'} (${verification?.assignedTrainer?.email || 'N/A'})`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixRelationship();