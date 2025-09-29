/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMessages() {
  try {
    console.log('=== CURRENT MESSAGES IN DATABASE ===');
    const messages = await prisma.message.findMany({
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        receiver: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (messages.length === 0) {
      console.log('NO MESSAGES FOUND');
    } else {
      messages.forEach(msg => {
        console.log(`Message: "${msg.content.substring(0, 30)}..."`);
        console.log(`  From: ${msg.sender.name} (${msg.sender.role}) [ID: ${msg.senderId}]`);
        console.log(`  To: ${msg.receiver.name} (${msg.receiver.role}) [ID: ${msg.receiverId}]`);
        console.log(`  Time: ${msg.createdAt}`);
        console.log('---');
      });
    }
    
    console.log('');
    console.log('=== USERS FOR REFERENCE ===');
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true }
    });
    users.forEach(user => {
      console.log(`${user.name} (${user.role}) - ID: ${user.id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();