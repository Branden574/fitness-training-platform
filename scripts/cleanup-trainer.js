/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndUpdateUsers() {
  try {
    console.log('=== BEFORE CHANGES ===');
    const beforeUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    beforeUsers.forEach(user => {
      console.log(`${user.name} (${user.email}) - ${user.role}`);
    });

    // Get Jane Smith's ID
    const janeSmith = await prisma.user.findUnique({
      where: { email: 'trainer@example.com' }
    });

    if (janeSmith) {
      console.log(`\nFound Jane Smith with ID: ${janeSmith.id}`);
      
      // Delete all messages where Jane Smith is sender or receiver
      const deletedMessages = await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: janeSmith.id },
            { receiverId: janeSmith.id }
          ]
        }
      });
      console.log(`✅ Deleted ${deletedMessages.count} messages involving Jane Smith`);

      // Now delete Jane Smith
      await prisma.user.delete({
        where: { id: janeSmith.id }
      });
      console.log('✅ Deleted Jane Smith');
    }

    // Update Brent Martinez from ADMIN to TRAINER
    await prisma.user.update({
      where: { email: 'admin@brentmartinezfitness.com' },
      data: { role: 'TRAINER' }
    });
    console.log('✅ Updated Brent Martinez from ADMIN to TRAINER');

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

cleanupAndUpdateUsers();