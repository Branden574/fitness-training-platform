/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugUsers() {
  try {
    console.log('=== ALL USERS ===');
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    users.forEach(user => {
      console.log(`${user.id}: ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log('\n=== MESSAGES WITH USER DATA ===');
    const messages = await prisma.message.findMany({
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        receiver: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    messages.forEach(message => {
      console.log(`Message: "${message.content.substring(0, 50)}..."`);
      console.log(`  From: ${message.sender.name} (${message.sender.email})`);
      console.log(`  To: ${message.receiver.name} (${message.receiver.email})`);
      console.log(`  Time: ${message.createdAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUsers();