/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUsers() {
  try {
    console.log('=== BEFORE CHANGES ===');
    const beforeUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    beforeUsers.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
    });

    // First, update Brent Martinez from ADMIN to TRAINER
    const brentUpdate = await prisma.user.update({
      where: { email: 'admin@brentmartinezfitness.com' },
      data: { role: 'TRAINER' }
    });
    console.log('\n✅ Updated Brent Martinez from ADMIN to TRAINER');

    // Delete Jane Smith (TRAINER)
    const janeDelete = await prisma.user.delete({
      where: { email: 'trainer@example.com' }
    });
    console.log('✅ Deleted Jane Smith (trainer@example.com)');

    console.log('\n=== AFTER CHANGES ===');
    const afterUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    afterUsers.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUsers();