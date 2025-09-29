// Test session authentication for appointments API
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSessionMapping() {
  try {
    console.log('🔍 Testing session user mapping...');
    
    // Find Brent's user record
    const brent = await prisma.user.findUnique({
      where: { email: 'Martinezfitness559@gmail.com' },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        createdAt: true
      }
    });
    
    console.log('👤 Brent in database:');
    console.log('  ID:', brent?.id);
    console.log('  Email:', brent?.email);
    console.log('  Role:', brent?.role);
    console.log('  Created:', brent?.createdAt);
    
    // Check if there are any duplicate users
    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: 'Martinezfitness559@gmail.com' },
          { name: { contains: 'Brent' } }
        ]
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true
      }
    });
    
    console.log('\n📊 All Brent-related users:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role} - ID: ${user.id}`);
    });
    
    // Check sessions
    const sessions = await prisma.session.findMany({
      where: { userId: brent?.id },
      select: {
        id: true,
        userId: true,
        expires: true,
        sessionToken: true,
        user: {
          select: { email: true, role: true }
        }
      }
    });
    
    console.log('\n🔐 Active sessions for Brent:');
    sessions.forEach(session => {
      const isExpired = session.expires < new Date();
      console.log(`  Session: ${session.sessionToken.substring(0, 10)}... (Expires: ${session.expires.toISOString()}) ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
  }
}

testSessionMapping();