/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simplifyUserUpdates() {
  try {
    console.log('=== BEFORE CHANGES ===');
    const beforeUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    beforeUsers.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
    });

    // Change Jane Smith from TRAINER to CLIENT (effectively removing her as trainer)
    await prisma.user.update({
      where: { email: 'trainer@example.com' },
      data: { role: 'CLIENT' }
    });
    console.log('✅ Changed Jane Smith from TRAINER to CLIENT');

    // Brent Martinez should already be TRAINER from previous script
    const brent = await prisma.user.findUnique({
      where: { email: 'admin@brentmartinezfitness.com' }
    });
    
    if (brent.role !== 'TRAINER') {
      await prisma.user.update({
        where: { email: 'admin@brentmartinezfitness.com' },
        data: { role: 'TRAINER' }
      });
      console.log('✅ Updated Brent Martinez to TRAINER');
    } else {
      console.log('✅ Brent Martinez is already TRAINER');
    }

    console.log('\n=== AFTER CHANGES ===');
    const afterUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    afterUsers.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
    });

    console.log('\n✅ Now Brent Martinez is the only TRAINER in the system!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

simplifyUserUpdates();