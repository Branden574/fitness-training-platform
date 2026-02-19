const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log('Current users in database:');
    users.forEach(user => {
      console.log(`- ${user.role}: ${user.email} (${user.name}) - ID: ${user.id}`);
    });
    
    console.log('\nDemo credentials:');
    console.log('Trainer: trainer@demo.com / demo123');
    console.log('Client: client@demo.com / demo123');
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();