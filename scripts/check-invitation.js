const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvitation() {
  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        email: 'branden574@icloud.com'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (invitation) {
      console.log('📧 Found invitation:');
      console.log('   Code:', invitation.code);
      console.log('   Email:', invitation.email);
      console.log('   Status:', invitation.status);
      console.log('   Created:', invitation.createdAt);
      console.log('   Invite URL:', `http://localhost:3000/invite/${invitation.code}`);
    } else {
      console.log('❌ No invitation found for branden574@icloud.com');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvitation();
