/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testClientQuery() {
  try {
    // Get the trainer ID
    const trainer = await prisma.user.findUnique({
      where: { email: 'brent@trainer.com' },
      select: { id: true, name: true, role: true }
    });
    
    console.log('Trainer:', trainer);
    
    if (!trainer) {
      console.log('❌ Trainer not found');
      return;
    }
    
    // Query clients assigned to this trainer - exactly what the API should do
    const clients = await prisma.user.findMany({
      where: { 
        trainerId: trainer.id, 
        role: 'CLIENT' 
      },
      include: {
        clientProfile: true,
        workoutSessions: {
          where: {
            completed: true
          },
          orderBy: {
            endTime: 'desc'
          },
          take: 1
        },
        progressEntries: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        },
        assignedTrainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('✅ Clients found:', clients.length);
    clients.forEach(client => {
      console.log(`- ${client.name} (${client.email}) - Trainer: ${client.trainerId}`);
    });
    
    // Also check all users to see the full picture
    const allUsers = await prisma.user.findMany({
      select: { 
        id: true,
        email: true, 
        name: true,
        role: true,
        trainerId: true
      }
    });
    
    console.log('\n=== ALL USERS ===');
    allUsers.forEach(user => {
      console.log(`${user.role}: ${user.name} (${user.email}) - TrainerID: ${user.trainerId || 'None'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testClientQuery();